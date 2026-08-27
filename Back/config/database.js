const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'sistemaVendas',
    'postgres',
    'nova_senha',
    {
        host: 'localhost',
        dialect: 'postgres',
        logging: false
    }
);

module.exports = sequelize;