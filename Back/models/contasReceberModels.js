const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Pedidos = require('./pedidosModels');
const Cliente = require('./clientesModels');

const ContasReceber = sequelize.define('ContasReceber', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    idPedido: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    total: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false
    },

    dataPrevisao: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },

    // SPV-85 — de quem receber, descrição e baixa (recebimento)
    idCliente: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    descricao: {
        type: DataTypes.STRING(255),
        allowNull: true
    },

    dataRecebimento: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },

    formaPagamento: {
        type: DataTypes.STRING(20),
        allowNull: true
    },

    dataCriacao: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: DataTypes.NOW
    },

    // SPV-73 — multa e juros cobrados no recebimento com atraso ("total" = valor da conta)
    valorMulta: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false,
        defaultValue: 0
    },

    valorJuros: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false,
        defaultValue: 0
    },

    diasAtraso: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }

},
{
    tableName: 'contasReceber',
    timestamps: false
});

ContasReceber.belongsTo(Pedidos, { foreignKey: 'idPedido', as: 'pedido' });
ContasReceber.belongsTo(Cliente, { foreignKey: 'idCliente', as: 'cliente' });

module.exports = ContasReceber;