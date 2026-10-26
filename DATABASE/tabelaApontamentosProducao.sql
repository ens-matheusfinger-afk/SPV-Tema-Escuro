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
