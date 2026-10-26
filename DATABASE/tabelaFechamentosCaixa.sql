-- SPV-84/97 - Fechamento de caixa e entradas por forma de pagamento
-- Rodar DEPOIS das tabelas caixa, contasPagar e contasReceber (o instalarBanco.sql já faz nessa ordem).
-- Pode rodar de novo sem erro.

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
