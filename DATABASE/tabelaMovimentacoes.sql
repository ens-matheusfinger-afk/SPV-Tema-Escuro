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