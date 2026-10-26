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
        allowNull: true // opcional: nem todo cliente tem e-mail
    },

    status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },

    // SPV-119: anotações do atendimento (ex.: "só paga na retirada", "prefere WhatsApp")
    observacao: {
        type: DataTypes.STRING(500),
        allowNull: true
    },

    // SPV-119: fator de confiança de 1 (baixa) a 5 (alta). Novo cliente começa em 3.
    fatorConfianca: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 3,
        validate: { min: 1, max: 5 }
    }

},
{
    tableName: 'clientes',
    timestamps: false,
    underscored: true // padrão do projeto: camelCase (JS) <-> snake_case (banco, sem aspas)
});

module.exports = Cliente;