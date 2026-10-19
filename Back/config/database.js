const { Sequelize } = require('sequelize');

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