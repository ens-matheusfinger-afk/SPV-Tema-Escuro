-- =====================================================================
-- SPV - Triggers do banco de dados (PostgreSQL)
-- ---------------------------------------------------------------------
-- Como rodar: no pgAdmin, abra o Query Tool no banco "sistemaVendas",
-- carregue este arquivo e execute (F5). Rode DEPOIS de criar as tabelas.
-- Pode rodar quantas vezes quiser: cada trigger é apagada e recriada.
--
-- Regra deste arquivo: as triggers NÃO repetem trabalho que o Back já
-- faz de um jeito que somaria duas vezes. Por isso a baixa/devolução de
-- estoque continua no Back (itensPedidoControllers / pedidosControllers).
-- Aqui ficam: cálculos que dão o mesmo resultado se rodarem duas vezes
-- e travas de segurança que o banco garante mesmo se alguém mexer
-- direto pelo pgAdmin.
--
-- Resumo:
--   1. trg_itens_pedido_total      -> total do pedido = soma dos itens
--   2. trg_itens_pedido_valor      -> preenche o valor unitário do item
--   3. trg_pedidos_regras          -> status válido, cancelado é final,
--                                     data de entrega ao finalizar,
--                                     pedido não pode ser apagado
--   4. trg_estoque_validar         -> estoque nunca negativo, mín/máx
--   5. trg_clientes_cpf_exclusivo  -> cliente é PF OU PJ, nunca os dois
--      trg_clientes_cnpj_exclusivo
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) TOTAL DO PEDIDO
-- Tabela: itens_pedido (depois de inserir, alterar ou remover um item)
-- O que faz: recalcula pedidos.total = soma de (quantidade * valor_unitario).
-- Por quê: o total nunca fica errado, nem se alguém mexer nos itens pelo
-- pgAdmin. O Back também recalcula; o resultado é o mesmo, então não dobra.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_recalcular_total_pedido(p_id_pedido INTEGER)
RETURNS VOID AS $$
DECLARE
	v_total NUMERIC(10,2);
BEGIN
	SELECT COALESCE(SUM(quantidade * valor_unitario), 0)
	  INTO v_total
	  FROM itens_pedido
	 WHERE id_pedido = p_id_pedido;

	-- Só grava se mudou (evita UPDATE à toa)
	UPDATE pedidos
	   SET total = v_total
	 WHERE id = p_id_pedido
	   AND total IS DISTINCT FROM v_total;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_itens_pedido_total()
RETURNS TRIGGER AS $$
BEGIN
	IF TG_OP IN ('INSERT', 'UPDATE') THEN
		PERFORM fn_recalcular_total_pedido(NEW.id_pedido);
	END IF;

	-- Na remoção, ou se o item foi trocado de pedido, recalcula o pedido antigo
	IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.id_pedido <> NEW.id_pedido) THEN
		PERFORM fn_recalcular_total_pedido(OLD.id_pedido);
	END IF;

	RETURN NULL; -- trigger AFTER: o retorno é ignorado
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_itens_pedido_total ON itens_pedido;
CREATE TRIGGER trg_itens_pedido_total
AFTER INSERT OR UPDATE OR DELETE ON itens_pedido
FOR EACH ROW EXECUTE FUNCTION fn_itens_pedido_total();


-- ---------------------------------------------------------------------
-- 2) VALOR UNITÁRIO DO ITEM
-- Tabela: itens_pedido (antes de inserir)
-- O que faz: se o item chegar sem valor_unitario, copia o preço atual
-- do produto ou do serviço.
-- Por quê: o preço fica "congelado" no item no momento da venda (mesmo
-- que o produto mude de preço depois). O Back já manda o valor; isto
-- cobre inserções feitas direto no banco.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_itens_pedido_valor()
RETURNS TRIGGER AS $$
BEGIN
	IF NEW.valor_unitario IS NULL THEN
		IF NEW.tipo_item = 'produto' THEN
			SELECT valor INTO NEW.valor_unitario FROM produtos WHERE id = NEW.id_produto;
		ELSE
			SELECT valor INTO NEW.valor_unitario FROM servicos WHERE id = NEW.id_servico;
		END IF;

		IF NEW.valor_unitario IS NULL THEN
			RAISE EXCEPTION 'Não foi possível definir o valor do item: % não encontrado.', NEW.tipo_item;
		END IF;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_itens_pedido_valor ON itens_pedido;
CREATE TRIGGER trg_itens_pedido_valor
BEFORE INSERT ON itens_pedido
FOR EACH ROW EXECUTE FUNCTION fn_itens_pedido_valor();


-- ---------------------------------------------------------------------
-- 3) REGRAS DO PEDIDO
-- Tabela: pedidos (antes de inserir, alterar ou apagar)
-- O que faz:
--   a) status só pode ser de 1 a 6 (máquina de estados do pedido);
--   b) pedido cancelado (6) é final: não pode mais ser alterado;
--   c) ao finalizar (5), grava a data de entrega se ela estiver vazia;
--   d) pedido não pode ser apagado: deve ser cancelado (REQ038,
--      preserva o histórico).
-- Status: 1 Cadastrado | 2 Em produção | 3 Aguardando conferência |
--         4 Aguardando cliente | 5 Finalizado | 6 Cancelado
-- Obs.: TRUNCATE (limpeza do banco de teste) não dispara esta trigger.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_pedidos_regras()
RETURNS TRIGGER AS $$
BEGIN
	-- d) não apagar
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'Pedido % não pode ser apagado. Cancele o pedido (status 6) para manter o histórico.', OLD.id;
	END IF;

	-- b) cancelado é final
	IF TG_OP = 'UPDATE' AND OLD.status = 6 THEN
		RAISE EXCEPTION 'Pedido % está cancelado e não pode mais ser alterado.', OLD.id;
	END IF;

	-- a) status válido
	IF NEW.status NOT BETWEEN 1 AND 6 THEN
		RAISE EXCEPTION 'Status % inválido. Use um valor de 1 a 6.', NEW.status;
	END IF;

	-- c) data de entrega ao finalizar
	IF NEW.status = 5 AND NEW.data_entrega_realizada IS NULL THEN
		NEW.data_entrega_realizada := NOW();
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedidos_regras ON pedidos;
CREATE TRIGGER trg_pedidos_regras
BEFORE INSERT OR UPDATE OR DELETE ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_pedidos_regras();


-- ---------------------------------------------------------------------
-- 4) VALIDAÇÃO DO ESTOQUE
-- Tabela: estoque (antes de inserir ou alterar)
-- O que faz: impede saldo negativo, mínimo negativo e máximo menor
-- que o mínimo.
-- Por quê: última barreira contra vender o que não tem, mesmo se duas
-- vendas acontecerem ao mesmo tempo ou alguém mexer pelo pgAdmin.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_estoque_validar()
RETURNS TRIGGER AS $$
BEGIN
	IF NEW.estoque_atual < 0 THEN
		RAISE EXCEPTION 'Saldo insuficiente: o estoque do produto % ficaria negativo (%).',
			NEW.id_produto, NEW.estoque_atual;
	END IF;

	IF NEW.estoque_minimo < 0 THEN
		RAISE EXCEPTION 'O estoque mínimo não pode ser negativo.';
	END IF;

	IF NEW.estoque_maximo IS NOT NULL AND NEW.estoque_maximo < NEW.estoque_minimo THEN
		RAISE EXCEPTION 'O estoque máximo (%) não pode ser menor que o mínimo (%).',
			NEW.estoque_maximo, NEW.estoque_minimo;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_estoque_validar ON estoque;
CREATE TRIGGER trg_estoque_validar
BEFORE INSERT OR UPDATE ON estoque
FOR EACH ROW EXECUTE FUNCTION fn_estoque_validar();


-- ---------------------------------------------------------------------
-- 5) CLIENTE É PF OU PJ, NUNCA OS DOIS
-- Tabelas: clientes_cpf e clientes_cnpj (antes de inserir ou alterar)
-- O que faz: um cliente (tabela pai "clientes") só pode ter UM filho:
-- ou um CPF (pessoa física) ou um CNPJ (pessoa jurídica).
-- Uma função só serve para as duas tabelas (TG_TABLE_NAME diz qual é).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_cliente_pf_ou_pj()
RETURNS TRIGGER AS $$
BEGIN
	IF TG_TABLE_NAME = 'clientes_cpf'
	   AND EXISTS (SELECT 1 FROM clientes_cnpj WHERE id_cliente = NEW.id_cliente) THEN
		RAISE EXCEPTION 'O cliente % já está cadastrado como pessoa jurídica (CNPJ).', NEW.id_cliente;
	END IF;

	IF TG_TABLE_NAME = 'clientes_cnpj'
	   AND EXISTS (SELECT 1 FROM clientes_cpf WHERE id_cliente = NEW.id_cliente) THEN
		RAISE EXCEPTION 'O cliente % já está cadastrado como pessoa física (CPF).', NEW.id_cliente;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clientes_cpf_exclusivo ON clientes_cpf;
CREATE TRIGGER trg_clientes_cpf_exclusivo
BEFORE INSERT OR UPDATE OF id_cliente ON clientes_cpf
FOR EACH ROW EXECUTE FUNCTION fn_cliente_pf_ou_pj();

DROP TRIGGER IF EXISTS trg_clientes_cnpj_exclusivo ON clientes_cnpj;
CREATE TRIGGER trg_clientes_cnpj_exclusivo
BEFORE INSERT OR UPDATE OF id_cliente ON clientes_cnpj
FOR EACH ROW EXECUTE FUNCTION fn_cliente_pf_ou_pj();


-- ---------------------------------------------------------------------
-- Conferência: lista as triggers criadas por este arquivo
-- ---------------------------------------------------------------------
SELECT event_object_table AS tabela,
       trigger_name       AS trigger,
       action_timing      AS quando,
       string_agg(event_manipulation, ', ') AS eventos
  FROM information_schema.triggers
 WHERE trigger_name LIKE 'trg\_%'
 GROUP BY event_object_table, trigger_name, action_timing
 ORDER BY tabela, trigger;
