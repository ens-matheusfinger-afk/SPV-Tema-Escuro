const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Cliente = require('./clientesModel');

const ClienteCPF = sequelize.define('ClienteCPF', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    idCliente: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    cpf: {
        type: DataTypes.STRING(11),
        allowNull: false
    }

},
{
    tableName: 'clientesCPF',
    timestamps: false
});

Cliente.hasOne(ClienteCPF, { foreignKey: 'idCliente' });
ClienteCPF.belongsTo(Cliente, { foreignKey: 'idCliente' });

module.exports = ClienteCPF;