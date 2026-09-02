CREATE TABLE IF NOT EXISTS "contasPagar" (
    "id" SERIAL PRIMARY KEY,
    "item" INT NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "descricao" VARCHAR(255),
    "dataPagamento" DATE,
    "dataCriacao" DATE DEFAULT CURRENT_DATE,
    "valor" DECIMAL(10, 2) NOT NULL
);