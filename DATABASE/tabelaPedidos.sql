-- REQ004/REQ005/REQ008/REQ020 - Gerar, alterar status, imprimir e finalizar pedidos
-- status (numérico), seguindo o Diagrama de Máquina de Estados "Venda até a entrega":
--   1 = Cadastro do pedido
--   2 = Em produção
--   3 = Aguardando conferência
--   4 = Aguardando cliente / Pronto para retirada
--   5 = Entregue / Finalizado
--   6 = Cancelado
CREATE TABLE IF NOT EXISTS pedidos (
	id SERIAL PRIMARY KEY,
	descricao VARCHAR(255),

	id_cliente INTEGER NOT NULL REFERENCES clientes(id),

	id_vendedor INTEGER NOT NULL REFERENCES usuarios(id),

	data_criacao TIMESTAMP NOT NULL DEFAULT NOW(),
	data_entrega_prevista TIMESTAMP,
	data_entrega_realizada TIMESTAMP,

	status INTEGER NOT NULL DEFAULT 1,
	total NUMERIC(10,2) NOT NULL DEFAULT 0,
	anexo VARCHAR(255)
);
