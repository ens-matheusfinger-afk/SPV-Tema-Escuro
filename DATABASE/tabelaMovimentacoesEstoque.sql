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
