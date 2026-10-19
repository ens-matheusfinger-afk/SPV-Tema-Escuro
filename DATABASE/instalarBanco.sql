-- =====================================================================
-- SPV - Instalação do banco (PostgreSQL)
-- ---------------------------------------------------------------------
-- Cria TODAS as tabelas na ordem certa (uma tabela só pode apontar para
-- outra que já exista). Pode rodar de novo sem erro: tabelas que já
-- existem são mantidas como estão (IF NOT EXISTS).
--
-- Ordem de execução no pgAdmin (Query Tool, conectado no banco sistemaVendas):
--   1. instalarBanco.sql   (este arquivo)  -> tabelas
--   2. triggers.sql                        -> regras automáticas
--   3. dadosIniciais.sql                   -> usuário admin para o 1º login
--
-- O banco em si é criado antes, uma vez só (sistemaVendas.sql, ou no
-- pgAdmin: botão direito em Databases > Create > Database...).
--
-- As definições abaixo são cópia dos arquivos tabela*.sql / usuarios.sql
-- desta pasta. Se alguém alterar uma tabela, altere aqui também.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Usuários e permissões por tela (REQ001, REQ002)  (origem: usuarios.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "usuarios" (
	"id" SERIAL PRIMARY KEY,
	"login" VARCHAR(50) NOT NULL UNIQUE,
	"senha" VARCHAR(255) NOT NULL,
	"nome" VARCHAR(150) NOT NULL,
	"status" NUMERIC NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "usuarioTela" (
	"id" SERIAL PRIMARY KEY,
	"idUsuario" INTEGER NOT NULL REFERENCES "usuarios"(id),
	"tela" VARCHAR(100) NOT NULL,
	"podeAcessar" BOOLEAN NOT NULL DEFAULT false
);

-- ---------------------------------------------------------------------
-- 2. Clientes (tabela pai)  (origem: tabelaClientes.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(150) NOT NULL,
	telefone VARCHAR(255),
	email VARCHAR(100) NOT NULL,
	status BOOLEAN NOT NULL DEFAULT false
);

-- ---------------------------------------------------------------------
-- 3. Clientes pessoa física (filha)  (origem: tabelaClientesCPF.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes_cpf (
	id SERIAL PRIMARY KEY,
	id_cliente INTEGER NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
	cpf VARCHAR(11) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- 4. Clientes pessoa jurídica (filha)  (origem: tabelaClientesCNPJ.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes_cnpj (
	id SERIAL PRIMARY KEY,
	id_cliente INTEGER NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
	cnpj VARCHAR(14) NOT NULL UNIQUE,
	nome_fantasia VARCHAR(150)
);

-- ---------------------------------------------------------------------
-- 5. Produtos  (origem: tabelaProdutos.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produtos (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(150) NOT NULL,
	descricao VARCHAR(255),
	valor NUMERIC(10,2) NOT NULL,
	controla_estoque BOOLEAN NOT NULL DEFAULT false
);

-- ---------------------------------------------------------------------
-- 6. Serviços  (origem: tabelaServicos.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicos (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(150) NOT NULL,
	descricao VARCHAR(255),
	valor NUMERIC(10,2) NOT NULL,
	duracao_estimada INTEGER
);

-- ---------------------------------------------------------------------
-- 7. Estoque (1 linha por produto que controla estoque)  (origem: tabelaEstoque.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estoque (
	id SERIAL PRIMARY KEY,
	id_produto INTEGER NOT NULL UNIQUE REFERENCES produtos(id) ON DELETE CASCADE,
	estoque_atual INTEGER NOT NULL DEFAULT 0,
	estoque_minimo INTEGER NOT NULL DEFAULT 0,
	estoque_maximo INTEGER
);

-- ---------------------------------------------------------------------
-- 8. Pedidos  (origem: tabelaPedidos.sql)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 9. Itens do pedido  (origem: tabelaItensPedido.sql)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 10. Caixa  (origem: tabelaCaixa.sql)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 11. Contas a pagar  (origem: tabelaContasPagar.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "contasPagar" (
    "id" SERIAL PRIMARY KEY,
    "item" INT NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "descricao" VARCHAR(255),
    "dataPagamento" DATE,
    "dataCriacao" DATE DEFAULT CURRENT_DATE,
    "valor" DECIMAL(10, 2) NOT NULL
);

-- ---------------------------------------------------------------------
-- 12. Contas a receber  (origem: tabelaContasReceber.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "contasReceber" (
    "id" SERIAL PRIMARY KEY,
    "idPedido" INT,
    "total" DECIMAL(10, 2) NOT NULL,
    "dataPrevisao" DATE,
    FOREIGN KEY ("idPedido") REFERENCES "pedidos"("id") ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 13. Movimentações financeiras  (origem: tabelaMovimentacoes.sql)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "movimentacoes" (
    "id" SERIAL PRIMARY KEY,
    "tipo" VARCHAR(50) NOT NULL,
    "idReceber" INT NULL,
    "idPagar" INT NULL,
    "idUsuario" INT NOT NULL,
    "valorTotal" DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY ("idReceber") REFERENCES "contasReceber"("id") ON DELETE SET NULL,
    FOREIGN KEY ("idPagar") REFERENCES "contasPagar"("id") ON DELETE SET NULL,
    FOREIGN KEY ("idUsuario") REFERENCES "usuarios"("id")
);
