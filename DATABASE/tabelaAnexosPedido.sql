-- SPV-91 - Anexar fotos e arquivos nos pedidos
-- O arquivo em si fica na pasta Back/uploads/ (nome sorteado, sem colisão);
-- aqui fica só o registro: de qual pedido é, nome original, tipo, tamanho e quem enviou.
CREATE TABLE IF NOT EXISTS anexos_pedido (
	id SERIAL PRIMARY KEY,
	id_pedido INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
	nome_original VARCHAR(255) NOT NULL,
	arquivo VARCHAR(255) NOT NULL UNIQUE,          -- nome do arquivo salvo em Back/uploads/
	tipo VARCHAR(100) NOT NULL,                    -- tipo MIME (image/jpeg, application/pdf...)
	tamanho INTEGER NOT NULL CHECK (tamanho > 0),  -- em bytes
	data_envio TIMESTAMP NOT NULL DEFAULT NOW(),
	id_usuario INTEGER NOT NULL REFERENCES usuarios(id)
);
