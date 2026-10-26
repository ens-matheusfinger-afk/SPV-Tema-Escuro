-- =====================================================================
-- SPV - Instalação do banco (PostgreSQL)
-- ---------------------------------------------------------------------
-- Cria TODAS as tabelas na ordem certa (uma tabela só pode apontar para
-- outra que já exista). Pode rodar de novo sem erro: tabelas que já
-- existem são mantidas como estão (IF NOT EXISTS).
--
-- Ordem de execução no pgAdmin (Query Tool, conectado no banco sistemaVendas):
--   1. instalarBanco.sql   (este arquivo)  -> tabelas
--   2. triggers.sql                        -> regras automáticas
--   3. dadosIniciais.sql                   -> usuário admin para o 1º login
--
-- O banco em si é criado antes, uma vez só (sistemaVendas.sql, ou no
-- pgAdmin: botão direito em Databases > Create > Database...).
--
-- As definições abaixo são cópia dos arquivos tabela*.sql / usuarios.sql
-- desta pasta. Se alguém alterar uma tabela, altere aqui também.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Usuários e permissões por tela (REQ001, REQ002)  (origem: usuarios.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "usuarios" (
	"id" SERIAL PRIMARY KEY,
	"login" VARCHAR(50) NOT NULL UNIQUE,
	"senha" VARCHAR(255) NOT NULL,
	"nome" VARCHAR(150) NOT NULL,
	"status" NUMERIC NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "usuarioTela" (
	"id" SERIAL PRIMARY KEY,
	"idUsuario" INTEGER NOT NULL REFERENCES "usuarios"(id),
	"tela" VARCHAR(100) NOT NULL,
	"podeAcessar" BOOLEAN NOT NULL DEFAULT false
);

-- ---------------------------------------------------------------------
-- 2. Clientes (tabela pai)  (origem: tabelaClientes.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(150) NOT NULL,
	telefone VARCHAR(255),
	email VARCHAR(100),                                  -- opcional: nem todo cliente tem e-mail
	status BOOLEAN NOT NULL DEFAULT false,
	observacao VARCHAR(500),                             -- SPV-119: anotações do atendimento
	fator_confianca SMALLINT NOT NULL DEFAULT 3          -- SPV-119: 1 (baixa) a 5 (alta)
		CONSTRAINT chk_fator_confianca CHECK (fator_confianca BETWEEN 1 AND 5)
);

-- Banco criado antes do SPV-119: acrescenta as colunas novas e libera o e-mail vazio.
-- Pode rodar de novo sem erro.
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS observacao VARCHAR(500);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fator_confianca SMALLINT NOT NULL DEFAULT 3;
ALTER TABLE clientes ALTER COLUMN email DROP NOT NULL;
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_fator_confianca') THEN
		ALTER TABLE clientes ADD CONSTRAINT chk_fator_confianca CHECK (fator_confianca BETWEEN 1 AND 5);
	END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3. Clientes pessoa física (filha)  (origem: tabelaClientesCPF.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes_cpf (
	id SERIAL PRIMARY KEY,
	id_cliente INTEGER NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
	cpf VARCHAR(11) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- 4. Clientes pessoa jurídica (filha)  (origem: tabelaClientesCNPJ.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes_cnpj (
	id SERIAL PRIMARY KEY,
	id_cliente INTEGER NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
	cnpj VARCHAR(14) NOT NULL UNIQUE,
	nome_fantasia VARCHAR(150)
);

-- ---------------------------------------------------------------------
-- 5. Produtos  (origem: tabelaProdutos.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produtos (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(150) NOT NULL,
	descricao VARCHAR(255),
	valor NUMERIC(10,2) NOT NULL,
	controla_estoque BOOLEAN NOT NULL DEFAULT false
);

-- ---------------------------------------------------------------------
-- 6. Serviços  (origem: tabelaServicos.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicos (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(150) NOT NULL,
	descricao VARCHAR(255),
	valor NUMERIC(10,2) NOT NULL,
	duracao_estimada INTEGER
);

-- ---------------------------------------------------------------------
-- 7. Estoque (1 linha por produto que controla estoque)  (origem: tabelaEstoque.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estoque (
	id SERIAL PRIMARY KEY,
	id_produto INTEGER NOT NULL UNIQUE REFERENCES produtos(id) ON DELETE CASCADE,
	estoque_atual INTEGER NOT NULL DEFAULT 0,
	estoque_minimo INTEGER NOT NULL DEFAULT 0,
	estoque_maximo INTEGER
);

-- ---------------------------------------------------------------------
-- 8. Pedidos  (origem: tabelaPedidos.sql)
-- ---------------------------------------------------------------------
-- REQ004/REQ005/REQ008/REQ020 - Gerar, alterar status, imprimir e finalizar pedidos
-- status (numérico), seguindo o Diagrama de Máquina de Estados "Venda até a entrega":
--   1 = Cadastro do pedido
--   2 = Em produção
--   3 = Aguardando conferência
--   4 = Aguardando cliente / Pronto para retirada
--   5 = Entregue / Finalizado
--   6 = Cancelado
CREATE TABLE IF NOT EXISTS pedidos (
	id SERIAL PRIMARY KEY,
	descricao VARCHAR(255),

	id_cliente INTEGER NOT NULL REFERENCES clientes(id),

	id_vendedor INTEGER NOT NULL REFERENCES usuarios(id),

	data_criacao TIMESTAMP NOT NULL DEFAULT NOW(),
	data_entrega_prevista TIMESTAMP,
	data_entrega_realizada TIMESTAMP,

	status INTEGER NOT NULL DEFAULT 1,
	total NUMERIC(10,2) NOT NULL DEFAULT 0,
	anexo VARCHAR(255)
);

-- SPV-118: pedido aberto para cliente inadimplente só com liberação de quem tem acesso
-- ao financeiro (Contas a receber). Fica registrado quem liberou e por quê.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS id_liberado_por INTEGER REFERENCES usuarios(id);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS motivo_liberacao VARCHAR(255);

-- ---------------------------------------------------------------------
-- 9. Itens do pedido  (origem: tabelaItensPedido.sql)
-- ---------------------------------------------------------------------
-- Cada item de um pedido é OU um produto OU um serviço (REQ004: "pedidos
-- vinculados a clientes e serviços/produtos"). O CHECK abaixo garante que
-- exatamente um dos dois (id_produto / id_servico) esteja preenchido.
-- valor_unitario guarda o preço no momento da venda (o preço do produto/
-- serviço pode mudar depois, mas o valor do pedido já fechado não deve mudar).
CREATE TABLE IF NOT EXISTS itens_pedido (
	id SERIAL PRIMARY KEY,
	id_pedido INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
	tipo_item VARCHAR(10) NOT NULL CHECK (tipo_item IN ('produto', 'servico')),
	id_produto INTEGER REFERENCES produtos(id),
	id_servico INTEGER REFERENCES servicos(id),
	quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
	valor_unitario NUMERIC(10,2) NOT NULL,
	CONSTRAINT chk_item_unico CHECK (
		(tipo_item = 'produto' AND id_produto IS NOT NULL AND id_servico IS NULL) OR
		(tipo_item = 'servico' AND id_servico IS NOT NULL AND id_produto IS NULL)
	)
);

-- ---------------------------------------------------------------------
-- 10. Caixa  (origem: tabelaCaixa.sql)
-- ---------------------------------------------------------------------
-- REQ013 - Módulo de Fechamento de Caixa
-- tipo: 'entrada' (venda/recebimento) ou 'saida' (despesa do dia)
-- forma_pagamento: obrigatória para entradas (dinheiro, pix, cartao); opcional para saídas
CREATE TABLE IF NOT EXISTS caixa (
	id SERIAL PRIMARY KEY,
	data TIMESTAMP NOT NULL DEFAULT NOW(),
	tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
	forma_pagamento VARCHAR(10) CHECK (forma_pagamento IN ('dinheiro', 'pix', 'cartao')),
	valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
	descricao VARCHAR(255),

	-- Preenchido quando a entrada vem de uma venda (pedido finalizado); nulo para despesas avulsas
	id_pedido INTEGER REFERENCES pedidos(id),

	-- Quem registrou o lançamento
	id_usuario INTEGER NOT NULL REFERENCES usuarios(id),

	CONSTRAINT chk_forma_pagamento_entrada CHECK (
		tipo = 'saida' OR forma_pagamento IS NOT NULL
	)
);

-- ---------------------------------------------------------------------
-- 11. Contas a pagar  (origem: tabelaContasPagar.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "contasPagar" (
    "id" SERIAL PRIMARY KEY,
    "item" INT NOT NULL DEFAULT 1,
    "tipo" VARCHAR(50) NOT NULL,          -- categoria: Aluguel, Matéria-prima, Energia...
    "descricao" VARCHAR(255),
    "dataPagamento" DATE,                 -- preenchida = conta paga
    "dataCriacao" DATE DEFAULT CURRENT_DATE,
    "valor" DECIMAL(10, 2) NOT NULL,
    "fornecedor" VARCHAR(150),            -- SPV-86
    "dataVencimento" DATE,                -- SPV-86/98/99: alerta e previsão de pagamentos
    "formaPagamento" VARCHAR(20)          -- como foi paga (dinheiro, pix, cartao, boleto, transferencia)
);

-- Banco criado antes do SPV-86: acrescenta as colunas novas. Pode rodar de novo sem erro.
ALTER TABLE "contasPagar" ADD COLUMN IF NOT EXISTS "fornecedor" VARCHAR(150);
ALTER TABLE "contasPagar" ADD COLUMN IF NOT EXISTS "dataVencimento" DATE;
ALTER TABLE "contasPagar" ADD COLUMN IF NOT EXISTS "formaPagamento" VARCHAR(20);
ALTER TABLE "contasPagar" ALTER COLUMN "item" SET DEFAULT 1;

-- ---------------------------------------------------------------------
-- 12. Contas a receber  (origem: tabelaContasReceber.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "contasReceber" (
    "id" SERIAL PRIMARY KEY,
    "idPedido" INT,
    "total" DECIMAL(10, 2) NOT NULL,
    "dataPrevisao" DATE,                  -- vencimento (pedido: data prevista de entrega)
    "idCliente" INT REFERENCES clientes(id),   -- SPV-85: de quem receber
    "descricao" VARCHAR(255),
    "dataRecebimento" DATE,               -- preenchida = recebida
    "formaPagamento" VARCHAR(20),         -- dinheiro, pix ou cartao
    "dataCriacao" DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY ("idPedido") REFERENCES "pedidos"("id") ON DELETE SET NULL
);

-- Banco criado antes do SPV-85: acrescenta as colunas novas. Pode rodar de novo sem erro.
ALTER TABLE "contasReceber" ADD COLUMN IF NOT EXISTS "idCliente" INT REFERENCES clientes(id);
ALTER TABLE "contasReceber" ADD COLUMN IF NOT EXISTS "descricao" VARCHAR(255);
ALTER TABLE "contasReceber" ADD COLUMN IF NOT EXISTS "dataRecebimento" DATE;
ALTER TABLE "contasReceber" ADD COLUMN IF NOT EXISTS "formaPagamento" VARCHAR(20);
ALTER TABLE "contasReceber" ADD COLUMN IF NOT EXISTS "dataCriacao" DATE DEFAULT CURRENT_DATE;

-- ---------------------------------------------------------------------
-- 13. Movimentações financeiras  (origem: tabelaMovimentacoes.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "movimentacoes" (
    "id" SERIAL PRIMARY KEY,
    "tipo" VARCHAR(50) NOT NULL,
    "idReceber" INT NULL,
    "idPagar" INT NULL,
    "idUsuario" INT NOT NULL,
    "valorTotal" DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY ("idReceber") REFERENCES "contasReceber"("id") ON DELETE SET NULL,
    FOREIGN KEY ("idPagar") REFERENCES "contasPagar"("id") ON DELETE SET NULL,
    FOREIGN KEY ("idUsuario") REFERENCES "usuarios"("id")
);

-- ---------------------------------------------------------------------
-- 14. Anexos dos pedidos (SPV-91)  (origem: tabelaAnexosPedido.sql)
-- ---------------------------------------------------------------------
-- SPV-91 - Anexar fotos e arquivos nos pedidos
-- O arquivo em si fica na pasta Back/uploads/ (nome sorteado, sem colisão);
-- aqui fica só o registro: de qual pedido é, nome original, tipo, tamanho e quem enviou.
CREATE TABLE IF NOT EXISTS anexos_pedido (
	id SERIAL PRIMARY KEY,
	id_pedido INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
	nome_original VARCHAR(255) NOT NULL,
	arquivo VARCHAR(255) NOT NULL UNIQUE,          -- nome do arquivo salvo em Back/uploads/
	tipo VARCHAR(100) NOT NULL,                    -- tipo MIME (image/jpeg, application/pdf...)
	tamanho INTEGER NOT NULL CHECK (tamanho > 0),  -- em bytes
	data_envio TIMESTAMP NOT NULL DEFAULT NOW(),
	id_usuario INTEGER NOT NULL REFERENCES usuarios(id)
);

-- ---------------------------------------------------------------------
-- 15. Apontamentos de produção (SPV-93/94/95)  (origem: tabelaApontamentosProducao.sql)
-- ---------------------------------------------------------------------
-- SPV-93/94/95 - Apontamento de produção (M.E.S. - REQ010)
-- Cada linha é um período de trabalho de um operador em um pedido:
--   início (SPV-93) -> conclusão com quantidade produzida (SPV-94/95).
-- Enquanto "fim" estiver vazio, o apontamento está em andamento.
CREATE TABLE IF NOT EXISTS apontamentos_producao (
	id SERIAL PRIMARY KEY,
	id_pedido INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
	id_usuario INTEGER NOT NULL REFERENCES usuarios(id),   -- operador
	inicio TIMESTAMP NOT NULL DEFAULT NOW(),
	fim TIMESTAMP,
	quantidade_produzida INTEGER CHECK (quantidade_produzida >= 0),
	observacao VARCHAR(255),

	CONSTRAINT chk_fim_depois_do_inicio CHECK (fim IS NULL OR fim >= inicio),
	CONSTRAINT chk_quantidade_ao_concluir CHECK (fim IS NULL OR quantidade_produzida IS NOT NULL)
);

-- Um operador não pode ter dois apontamentos abertos no mesmo pedido
CREATE UNIQUE INDEX IF NOT EXISTS uq_apontamento_aberto
	ON apontamentos_producao (id_pedido, id_usuario) WHERE fim IS NULL;

-- ---------------------------------------------------------------------
-- 16. Movimentações do estoque (SPV-65/108/109)  (origem: tabelaMovimentacoesEstoque.sql)
-- ---------------------------------------------------------------------
-- SPV-65/108/109 - Histórico de movimentações do estoque (REQ017)
-- Cada mudança de saldo vira uma linha: quem mexeu, quanto, por quê e o saldo antes/depois.
--   entrada   -> chegada de mercadoria (ou saldo inicial do produto)
--   saida     -> retirada manual (perda, avaria, uso interno...)
--   ajuste    -> correção pela contagem física / inventário (SPV-109)
--   venda     -> baixa automática por item de pedido
--   devolucao -> volta automática (item removido, quantidade diminuída ou pedido cancelado)
-- "quantidade" tem sinal: positivo entra, negativo sai.
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
	id SERIAL PRIMARY KEY,
	id_produto INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
	tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'venda', 'devolucao')),
	quantidade INTEGER NOT NULL CHECK (quantidade <> 0),
	saldo_anterior INTEGER NOT NULL,
	saldo_atual INTEGER NOT NULL CHECK (saldo_atual >= 0),
	motivo VARCHAR(255),
	id_pedido INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
	id_usuario INTEGER REFERENCES usuarios(id),
	data TIMESTAMP NOT NULL DEFAULT NOW(),

	CONSTRAINT chk_saldo_confere CHECK (saldo_atual = saldo_anterior + quantidade)
);

CREATE INDEX IF NOT EXISTS idx_mov_estoque_produto ON movimentacoes_estoque (id_produto, data DESC);

-- ---------------------------------------------------------------------
-- 17. Conferências de qualidade (SPV-96)  (origem: tabelaConferenciasPedido.sql)
-- ---------------------------------------------------------------------
-- SPV-96 - Registro de aprovação ou devolução para retrabalho (conferência de qualidade)
-- Cada conferência de um pedido vira uma linha: quem conferiu, quando, o resultado e o motivo.
-- Devolução exige motivo (o operador precisa saber o que corrigir).
CREATE TABLE IF NOT EXISTS conferencias_pedido (
	id SERIAL PRIMARY KEY,
	id_pedido INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
	id_usuario INTEGER NOT NULL REFERENCES usuarios(id),   -- conferente
	resultado VARCHAR(10) NOT NULL CHECK (resultado IN ('aprovado', 'devolvido')),
	motivo VARCHAR(255),
	data TIMESTAMP NOT NULL DEFAULT NOW(),

	CONSTRAINT chk_devolucao_com_motivo CHECK (
		resultado = 'aprovado' OR (motivo IS NOT NULL AND length(trim(motivo)) > 0)
	)
);

-- ---------------------------------------------------------------------
-- 18. Caixa: ligação com as contas e fechamento diário (SPV-84/97)
--     (origem: tabelaFechamentosCaixa.sql)
-- ---------------------------------------------------------------------

-- 1) Caixa: aceita também boleto e transferência (pagamento de contas) e guarda de qual conta
--    veio o lançamento (recebimento/pagamento). Desfazer o recebimento apaga o lançamento junto.
ALTER TABLE caixa ALTER COLUMN forma_pagamento TYPE VARCHAR(20);
ALTER TABLE caixa DROP CONSTRAINT IF EXISTS caixa_forma_pagamento_check;
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_caixa_forma_pagamento') THEN
		ALTER TABLE caixa ADD CONSTRAINT chk_caixa_forma_pagamento
			CHECK (forma_pagamento IN ('dinheiro', 'pix', 'cartao', 'boleto', 'transferencia'));
	END IF;
END $$;
ALTER TABLE caixa ADD COLUMN IF NOT EXISTS id_conta_receber INTEGER REFERENCES "contasReceber"(id) ON DELETE SET NULL;
ALTER TABLE caixa ADD COLUMN IF NOT EXISTS id_conta_pagar INTEGER REFERENCES "contasPagar"(id) ON DELETE SET NULL;

-- 2) Fechamento: um por dia. Guarda os totais do dia, o dinheiro que deveria estar na gaveta,
--    o que foi contado e a diferença (negativa = faltou dinheiro). Diferença exige explicação.
--    Depois de fechado, o dia não aceita mais lançamentos (o Back bloqueia).
CREATE TABLE IF NOT EXISTS fechamentos_caixa (
	id SERIAL PRIMARY KEY,
	data DATE NOT NULL UNIQUE,
	saldo_inicial NUMERIC(10,2) NOT NULL DEFAULT 0,      -- dinheiro contado no fechamento anterior
	entradas_dinheiro NUMERIC(10,2) NOT NULL DEFAULT 0,
	entradas_pix NUMERIC(10,2) NOT NULL DEFAULT 0,
	entradas_cartao NUMERIC(10,2) NOT NULL DEFAULT 0,
	saidas_dinheiro NUMERIC(10,2) NOT NULL DEFAULT 0,
	saidas_outras NUMERIC(10,2) NOT NULL DEFAULT 0,      -- PIX, cartão, boleto, transferência
	dinheiro_esperado NUMERIC(10,2) NOT NULL,             -- saldo inicial + entradas - saídas em dinheiro
	dinheiro_contado NUMERIC(10,2) NOT NULL CHECK (dinheiro_contado >= 0),
	diferenca NUMERIC(10,2) NOT NULL,                     -- contado - esperado
	observacao VARCHAR(255),
	id_usuario INTEGER NOT NULL REFERENCES usuarios(id), -- quem fechou
	fechado_em TIMESTAMP NOT NULL DEFAULT NOW(),

	CONSTRAINT chk_diferenca_explicada CHECK (
		diferenca = 0 OR (observacao IS NOT NULL AND length(trim(observacao)) > 0)
	)
);

-- ---------------------------------------------------------------------
-- 19. View de pendências por cliente (SPV-58)  (origem: viewPendenciasClientes.sql)
--     Fica por último: depende de clientes, pedidos e contasReceber.
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_pendencias_clientes;

CREATE VIEW vw_pendencias_clientes AS
WITH hoje AS (
	SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS dia
),
contas AS (
	SELECT cr."idCliente" AS id_cliente,
	       SUM(cr."total") FILTER (WHERE cr."dataRecebimento" IS NULL) AS a_receber,
	       SUM(cr."total") FILTER (
	           WHERE cr."dataRecebimento" IS NULL
	             AND cr."dataPrevisao" < (SELECT dia FROM hoje)
	             AND (cr."idPedido" IS NULL OR p.status = 5)
	       ) AS vencido,
	       COUNT(*) FILTER (
	           WHERE cr."dataRecebimento" IS NULL
	             AND cr."dataPrevisao" < (SELECT dia FROM hoje)
	             AND (cr."idPedido" IS NULL OR p.status = 5)
	       ) AS qtd_vencidas
	  FROM "contasReceber" cr
	  LEFT JOIN pedidos p ON p.id = cr."idPedido"
	 WHERE cr."idCliente" IS NOT NULL
	 GROUP BY cr."idCliente"
),
peds AS (
	SELECT id_cliente,
	       COUNT(*) FILTER (WHERE status = 4) AS prontos,
	       array_agg(id ORDER BY id) FILTER (WHERE status = 4) AS ids_prontos,
	       COUNT(*) FILTER (WHERE status BETWEEN 1 AND 3) AS em_andamento
	  FROM pedidos
	 GROUP BY id_cliente
)
SELECT c.id                                 AS id_cliente,
       c.nome,
       c.telefone,
       c.fator_confianca,
       c.status                             AS cliente_ativo,
       COALESCE(ct.vencido, 0)::numeric(10,2)   AS valor_vencido,
       COALESCE(ct.qtd_vencidas, 0)::integer    AS contas_vencidas,
       COALESCE(ct.a_receber, 0)::numeric(10,2) AS valor_a_receber,
       COALESCE(pd.prontos, 0)::integer         AS pedidos_prontos,
       COALESCE(pd.ids_prontos, '{}')           AS ids_pedidos_prontos,
       COALESCE(pd.em_andamento, 0)::integer    AS pedidos_em_andamento,
       COALESCE(ct.vencido, 0) > 0              AS inadimplente
  FROM clientes c
  LEFT JOIN contas ct ON ct.id_cliente = c.id
  LEFT JOIN peds   pd ON pd.id_cliente = c.id
 WHERE COALESCE(ct.a_receber, 0) > 0
    OR COALESCE(pd.prontos, 0) > 0
    OR COALESCE(pd.em_andamento, 0) > 0;


-- ---------------------------------------------------------------------
-- 20. Descontos nos pedidos e multa/juros nas contas a receber (SPV-73)  (origem: descontosMultas.sql)
-- ---------------------------------------------------------------------

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


-- ---------------------------------------------------------------------
-- 21. Registro de logs / auditoria (SPV-111, REQ028)  (origem: tabelaLogs.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs (
	id SERIAL PRIMARY KEY,
	data_hora TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'), -- em UTC, como as outras datas do Back
	id_usuario INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	usuario_nome VARCHAR(100),            -- nome na hora da ação (continua aparecendo se o usuário sair)
	modulo VARCHAR(30) NOT NULL,          -- acesso, pedidos, producao, financeiro, estoque, cadastros
	acao VARCHAR(40) NOT NULL,            -- ex.: login, pedido_criado, pedido_status, conta_paga
	descricao VARCHAR(500) NOT NULL,      -- frase legível: "Pedido nº 12: Em produção"
	entidade VARCHAR(30),                 -- tabela/assunto: pedido, conta_receber, caixa...
	id_entidade INTEGER,
	ip VARCHAR(64),
	detalhes JSONB                        -- dados extras (status antigo/novo, valores...)
);

CREATE INDEX IF NOT EXISTS idx_logs_data_hora ON logs (data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs (id_usuario);
CREATE INDEX IF NOT EXISTS idx_logs_entidade ON logs (entidade, id_entidade);
