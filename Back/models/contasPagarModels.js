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
        allowNull: false
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
    }

},
{
    tableName: 'contasPagar',
    timestamps: false
});

ContasPagar.criarPendencia = async function(dados){
    const { item, tipo, descricao, dataPagamento, dataCriacao, valor } = dados;
    const registro = await ContasPagar.create({ item, tipo, descricao, dataPagamento, dataCriacao, valor });
    return registro.id;
};

ContasPagar.editarPendencia = async function(id, dados){
    const { item, tipo, descricao, dataPagamento, dataCriacao, valor } = dados;
    const registro = await ContasPagar.findByPk(id);
    if(!registro) throw new Error('Pendência não encontrada.');
    await registro.update({ item, tipo, descricao, dataPagamento, dataCriacao, valor });
};

ContasPagar.excluirPendencia = async function(id){
    const registro = await ContasPagar.findByPk(id);
    if(!registro) throw new Error('Pendência não encontrada.');
    await registro.destroy();
};

ContasPagar.listarTudo = async function(){
    return await ContasPagar.findAll();
};

module.exports = ContasPagar;