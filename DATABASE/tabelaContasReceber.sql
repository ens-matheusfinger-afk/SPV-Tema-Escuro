CREATE TABLE IF NOT EXISTS "contasReceber" (
    "id" SERIAL PRIMARY KEY,
    "idPedido" INT,
    "total" DECIMAL(10, 2) NOT NULL,
    "dataPrevisao" DATE,
    FOREIGN KEY ("idPedido") REFERENCES "pedidos"("id") ON DELETE SET NULL
);