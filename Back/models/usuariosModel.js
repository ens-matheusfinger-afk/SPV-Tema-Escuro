const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    login: {
        type: DataTypes.STRING(50)
    },

    senha: {
        type: DataTypes.STRING(255)
    },

    nome: {
        type: DataTypes.STRING(150)
    },

    status: {
        type: DataTypes.NUMERIC,
        allowNull: false
    }

},
{
    tableName: 'usuarios',
    timestamps: false
});

module.exports = Usuario;