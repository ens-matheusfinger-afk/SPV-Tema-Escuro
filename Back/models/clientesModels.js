const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cliente = sequelize.define('Cliente', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    nome: {
        type: DataTypes.STRING(150),
        allowNull: false
    },

    telefone: {
        type: DataTypes.STRING(255),
        allowNull: true
    },

    email: {
        type: DataTypes.STRING(100),
        allowNull: false
    },

    status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }

},
{
    tableName: 'clientes',
    timestamps: false,
    underscored: true // padrão do projeto: camelCase (JS) <-> snake_case (banco, sem aspas)
});

module.exports = Cliente;