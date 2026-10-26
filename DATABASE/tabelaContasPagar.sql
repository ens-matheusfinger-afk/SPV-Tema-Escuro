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
