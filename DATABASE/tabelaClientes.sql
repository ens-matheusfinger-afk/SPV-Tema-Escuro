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
