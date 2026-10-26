-- =====================================================================
-- SPV-73 - Descontos nos pedidos e multa/juros nas contas a receber
-- ---------------------------------------------------------------------
-- Como rodar: no pgAdmin (banco "sistemaVendas"), Query Tool, carregar e F5.
-- Pode rodar quantas vezes quiser (IF NOT EXISTS). Depois rode também o
-- triggers.sql atualizado (trigger 1 e trigger 7 calculam o total com desconto).
-- =====================================================================

-- 1) PEDIDOS: total = subtotal (soma dos itens) - desconto
--    desconto_tipo: 'valor' (R$) ou 'percentual' (% do subtotal); nulo = sem desconto
--    desconto_informado: o número digitado (R$ ou %); valor_desconto: quanto deu em R$
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS desconto_tipo VARCHAR(10);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS desconto_informado NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS valor_desconto NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS motivo_desconto VARCHAR(255);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS id_desconto_por INTEGER REFERENCES usuarios(id);

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pedidos_desconto_tipo') THEN
		ALTER TABLE pedidos ADD CONSTRAINT chk_pedidos_desconto_tipo
			CHECK (desconto_tipo IS NULL OR desconto_tipo IN ('valor', 'percentual'));
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pedidos_desconto_valores') THEN
		ALTER TABLE pedidos ADD CONSTRAINT chk_pedidos_desconto_valores
			CHECK (valor_desconto >= 0 AND valor_desconto <= subtotal);
	END IF;
END $$;

-- Pedidos que já existiam: subtotal = total (não tinham desconto).
-- A trigger de regras (trg_pedidos_regras) bloqueia mexer em pedido cancelado; aqui é só
-- o preenchimento da coluna nova, então ela fica desligada só durante este UPDATE.
DO $$
DECLARE
	v_tem_trigger BOOLEAN;
BEGIN
	SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pedidos_regras' AND tgrelid = 'pedidos'::regclass)
	  INTO v_tem_trigger;
	IF v_tem_trigger THEN
		ALTER TABLE pedidos DISABLE TRIGGER trg_pedidos_regras;
	END IF;

	UPDATE pedidos SET subtotal = total WHERE subtotal = 0 AND total <> 0 AND valor_desconto = 0;

	IF v_tem_trigger THEN
		ALTER TABLE pedidos ENABLE TRIGGER trg_pedidos_regras;
	END IF;
END $$;

-- 2) CONTAS A RECEBER: multa e juros cobrados no recebimento de conta vencida
--    "total" continua sendo o valor da conta (principal); multa e juros ficam separados.
--    O que entrou no caixa = total + valorMulta + valorJuros.
ALTER TABLE "contasReceber" ADD COLUMN IF NOT EXISTS "valorMulta" NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "contasReceber" ADD COLUMN IF NOT EXISTS "valorJuros" NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "contasReceber" ADD COLUMN IF NOT EXISTS "diasAtraso" INTEGER NOT NULL DEFAULT 0;
