CREATE TABLE "usuarios" (
	"id" SERIAL PRIMARY KEY,
	"login" VARCHAR(50),
	"senha" VARCHAR(255),
	"nome" VARCHAR(150),
	"status" NUMERIC NOT NULL
);

INSERT INTO usuarios (login, senha, nome, status)
VALUES ('diego', 'senha_hash', 'Diego', 1),
('matheus', 'nInteressa', 'Matheus Finger.', 1),
('carlos', 'Conhece?', 'Carlos Borges', 1),
('Felipe', 'Graxa123', 'Felipe J.', 1),
('Maria', 'FFFkk123', 'Maria', 1),
('Mariana', 'caboCriatividade', 'Mariana', 1),
('Cuiudo', 'caboCriatividade', 'Cuiudo B.', 0),
('Serjão', 'caboCriatividade', 'Serjão B.', 0),
('Zezo', 'ChegaDeUsuario', 'Zezo Zezão', 0);
