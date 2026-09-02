-- REQ013 - Módulo de Fechamento de Caixa
-- tipo: 'entrada' (venda/recebimento) ou 'saida' (despesa do dia)
-- forma_pagamento: obrigatória para entradas (dinheiro, pix, cartao); opcional para saídas
CREATE TABLE IF NOT EXISTS caixa (
	id SERIAL PRIMARY KEY,
	data TIMESTAMP NOT NULL DEFAULT NOW(),
	tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
	forma_pagamento VARCHAR(10) CHECK (forma_pagamento IN ('dinheiro', 'pix', 'cartao')),
	valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
	descricao VARCHAR(255),

	-- Preenchido quando a entrada vem de uma venda (pedido finalizado); nulo para despesas avulsas
	id_pedido INTEGER REFERENCES pedidos(id),

	-- Quem registrou o lançamento
	id_usuario INTEGER NOT NULL REFERENCES usuarios(id),

	CONSTRAINT chk_forma_pagamento_entrada CHECK (
		tipo = 'saida' OR forma_pagamento IS NOT NULL
	)
);
