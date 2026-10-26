const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ContasPagar = sequelize.define('ContasPagar', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    item: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },

    tipo: {
        type: DataTypes.STRING(50),
        allowNull: false
    },

    descricao: {
        type: DataTypes.STRING(255),
        allowNull: true
    },

    dataPagamento: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },

    dataCriacao: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: DataTypes.NOW
    },

    valor: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false
    },

    // SPV-86/98/99 — fornecedor, vencimento e como foi paga
    fornecedor: {
        type: DataTypes.STRING(150),
        allowNull: true
    },

    dataVencimento: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },

    formaPagamento: {
        type: DataTypes.STRING(20),
        allowNull: true
    }

},
{
    tableName: 'contasPagar',
    timestamps: false
});

ContasPagar.listarTudo = async function(){
    // vencimento mais próximo primeiro (contas sem vencimento vão para o fim)
    return await ContasPagar.findAll({ order: [['dataVencimento', 'ASC NULLS LAST'], ['id', 'ASC']] });
};

module.exports = ContasPagar;