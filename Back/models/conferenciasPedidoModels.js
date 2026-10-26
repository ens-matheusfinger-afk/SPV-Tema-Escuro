const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Pedidos = require('./pedidosModels');
const Usuario = require('./usuariosModels');

// SPV-96 - Conferência de qualidade do pedido: aprovado ou devolvido para retrabalho
const ConferenciasPedido = sequelize.define(
  'ConferenciasPedido',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idPedido: { type: DataTypes.INTEGER, allowNull: false },
    idUsuario: { type: DataTypes.INTEGER, allowNull: false },
    resultado: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: { isIn: [['aprovado', 'devolvido']] },
    },
    motivo: { type: DataTypes.STRING(255), allowNull: true },
    data: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'conferencias_pedido',
    timestamps: false,
    underscored: true,
  }
);

ConferenciasPedido.belongsTo(Pedidos, { foreignKey: 'idPedido', as: 'pedido' });
Pedidos.hasMany(ConferenciasPedido, { foreignKey: 'idPedido', as: 'conferencias' });
ConferenciasPedido.belongsTo(Usuario, { foreignKey: 'idUsuario', as: 'conferente' });

module.exports = ConferenciasPedido;
