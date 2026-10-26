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
