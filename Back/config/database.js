const { Sequelize } = require('sequelize');
const pg = require('pg');

// Colunas TIMESTAMP (sem fuso) guardam a hora em UTC: o Sequelize conecta com fuso +00:00
// e grava assim. Sem esta linha, o driver do PostgreSQL lê a hora como se fosse do fuso do
// computador (Brasília) e as horas aparecem 3h adiantadas na tela (ex.: início da produção).
const TIMESTAMP_SEM_FUSO = 1114;
pg.types.setTypeParser(TIMESTAMP_SEM_FUSO, (valor) => new Date(`${valor.replace(' ', 'T')}Z`));

// Dados de conexão: lidos do arquivo Back/.env (veja Back/.env.example).
// Sem o .env, usa os valores padrão abaixo (os mesmos de antes).
const sequelize = new Sequelize(
    process.env.DB_NAME || 'sistemaVendas',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'nova_senha',
    {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false
    }
);

module.exports = sequelize;