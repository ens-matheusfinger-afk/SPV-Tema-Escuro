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
