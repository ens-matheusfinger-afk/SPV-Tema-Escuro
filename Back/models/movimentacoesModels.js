const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Movimentacoes = sequelize.define('Movimentacoes', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    tipo: {
        type: DataTypes.STRING(50),
        allowNull: false
    },

    idReceber: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    idPagar: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    valorTotal: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false
    }

},
{
    tableName: 'movimentacoes',
    timestamps: false
});

Movimentacoes.receber = async function(dados){
    const { idReceber, idUsuario, valorTotal } = dados;
    const registro = await Movimentacoes.create({ tipo:'RECEBER', idReceber, idUsuario, valorTotal });
    return registro.id;
};

Movimentacoes.Pagar = async function(dados){
    const { idPagar, idUsuario, valorTotal } = dados;
    const registro = await Movimentacoes.create({ tipo:'PAGAR', idPagar, idUsuario, valorTotal });
    return registro.id;
};

Movimentacoes.receberDesconto = async function(dados){
    const { idReceber, idUsuario, valorTotal, desconto } = dados;
    const valorFinal = valorTotal - (desconto || 0);
    const registro = await Movimentacoes.create({ tipo:'RECEBER_DESCONTO', idReceber, idUsuario, valorTotal:valorFinal });
    return registro.id;
};

Movimentacoes.listarTudo = async function(){
    return await Movimentacoes.findAll();
};

module.exports = Movimentacoes;