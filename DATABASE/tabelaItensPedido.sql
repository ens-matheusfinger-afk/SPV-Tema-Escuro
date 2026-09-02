-- Cada item de um pedido é OU um produto OU um serviço (REQ004: "pedidos
-- vinculados a clientes e serviços/produtos"). O CHECK abaixo garante que
-- exatamente um dos dois (id_produto / id_servico) esteja preenchido.
-- valor_unitario guarda o preço no momento da venda (o preço do produto/
-- serviço pode mudar depois, mas o valor do pedido já fechado não deve mudar).
CREATE TABLE IF NOT EXISTS itens_pedido (
	id SERIAL PRIMARY KEY,
	id_pedido INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
	tipo_item VARCHAR(10) NOT NULL CHECK (tipo_item IN ('produto', 'servico')),
	id_produto INTEGER REFERENCES produtos(id),
	id_servico INTEGER REFERENCES servicos(id),
	quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
	valor_unitario NUMERIC(10,2) NOT NULL,
	CONSTRAINT chk_item_unico CHECK (
		(tipo_item = 'produto' AND id_produto IS NOT NULL AND id_servico IS NULL) OR
		(tipo_item = 'servico' AND id_servico IS NOT NULL AND id_produto IS NULL)
	)
);
