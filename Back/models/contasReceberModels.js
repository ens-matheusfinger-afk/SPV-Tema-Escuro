const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
    }

},
{
    tableName: 'contasReceber',
    timestamps: false
});

ContasReceber.pago = async function(dados){
    const { idPedido, total, dataPrevisao } = dados;
    const registro = await ContasReceber.create({ idPedido, total, dataPrevisao });
    return registro.id;
};

ContasReceber.adiantar = async function(id, dados){
    const { total, dataPrevisao } = dados;
    const registro = await ContasReceber.findByPk(id);
    if(!registro) throw new Error('Conta a receber não encontrada.');
    await registro.update({ total, dataPrevisao });
};

ContasReceber.cancela = async function(id){
    const registro = await ContasReceber.findByPk(id);
    if(!registro) throw new Error('Conta a receber não encontrada.');
    await registro.destroy();
};

ContasReceber.listarTudo = async function(){
    return await ContasReceber.findAll();
};

module.exports = ContasReceber;