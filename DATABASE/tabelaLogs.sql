-- =====================================================================
-- SPV-111 / REQ028 - Registro de logs (auditoria)
-- ---------------------------------------------------------------------
-- Guarda as operações relevantes feitas pelos usuários: login (certo e
-- errado), saída, criação de pedidos, mudanças de status (produção,
-- conferência, entrega), descontos, alterações financeiras (contas,
-- caixa) e cadastros. Quem grava é o Back (middleware utils/logs.js).
-- Pode rodar de novo sem erro (IF NOT EXISTS).
-- =====================================================================
CREATE TABLE IF NOT EXISTS logs (
	id SERIAL PRIMARY KEY,
	data_hora TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'), -- em UTC, como as outras datas do Back
	id_usuario INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	usuario_nome VARCHAR(100),            -- nome na hora da ação (continua aparecendo se o usuário sair)
	modulo VARCHAR(30) NOT NULL,          -- acesso, pedidos, producao, financeiro, estoque, cadastros
	acao VARCHAR(40) NOT NULL,            -- ex.: login, pedido_criado, pedido_status, conta_paga
	descricao VARCHAR(500) NOT NULL,      -- frase legível: "Pedido nº 12: Em produção"
	entidade VARCHAR(30),                 -- tabela/assunto: pedido, conta_receber, caixa...
	id_entidade INTEGER,
	ip VARCHAR(64),
	detalhes JSONB                        -- dados extras (status antigo/novo, valores...)
);

CREATE INDEX IF NOT EXISTS idx_logs_data_hora ON logs (data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs (id_usuario);
CREATE INDEX IF NOT EXISTS idx_logs_entidade ON logs (entidade, id_entidade);
