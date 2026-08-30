const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    login: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },

    senha: {
        type: DataTypes.STRING(255),
        allowNull: false
    },

    nome: {
        type: DataTypes.STRING(150),
        allowNull: false
    },

    status: {
        type: DataTypes.NUMERIC,
        allowNull: false,
        defaultValue: 1
    }

},
{
    tableName: 'usuarios',
    timestamps: false
});

module.exports = Usuario;