const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Cliente = require('./clientesModels');

const ClienteCNPJ = sequelize.define('ClienteCNPJ', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    idCliente: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    cnpj: {
        type: DataTypes.STRING(14),
        allowNull: false
    },

    nomeFantasia: {
        type: DataTypes.STRING(150),
        allowNull: true
    }

},
{
    tableName: 'clientes_cnpj',
    timestamps: false,
    underscored: true // idCliente/nomeFantasia (JS) <-> id_cliente/nome_fantasia (banco)
});

Cliente.hasOne(ClienteCNPJ, { foreignKey: 'idCliente' });
ClienteCNPJ.belongsTo(Cliente, { foreignKey: 'idCliente' });

module.exports = ClienteCNPJ;
