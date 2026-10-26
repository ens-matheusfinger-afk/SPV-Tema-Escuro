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

-- SPV-118: pedido aberto para cliente inadimplente só com liberação de quem tem acesso
-- ao financeiro (Contas a receber). Fica registrado quem liberou e por quê.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS id_liberado_por INTEGER REFERENCES usuarios(id);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS motivo_liberacao VARCHAR(255);
