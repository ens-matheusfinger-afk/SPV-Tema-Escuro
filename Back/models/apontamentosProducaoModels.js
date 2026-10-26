const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Pedidos = require('./pedidosModels');
const Usuario = require('./usuariosModels');

// SPV-93/94/95 - Apontamento de produção (M.E.S. - REQ010).
// Um período de trabalho de um operador em um pedido. fim = null -> em andamento.
const ApontamentosProducao = sequelize.define(
  'ApontamentosProducao',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idPedido: { type: DataTypes.INTEGER, allowNull: false },
    idUsuario: { type: DataTypes.INTEGER, allowNull: false },
    inicio: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    fim: { type: DataTypes.DATE, allowNull: true },
    quantidadeProduzida: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: { args: [0], msg: 'A quantidade produzida não pode ser negativa.' } },
    },
    observacao: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: 'apontamentos_producao',
    timestamps: false,
    underscored: true, // quantidadeProduzida (JS) <-> quantidade_produzida (banco)
  }
);

ApontamentosProducao.belongsTo(Pedidos, { foreignKey: 'idPedido', as: 'pedido' });
Pedidos.hasMany(ApontamentosProducao, { foreignKey: 'idPedido', as: 'apontamentos' });
ApontamentosProducao.belongsTo(Usuario, { foreignKey: 'idUsuario', as: 'operador' });

module.exports = ApontamentosProducao;
