const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Pedidos = require('./pedidosModels');
const Usuario = require('./usuariosModels');

// SPV-91 - Anexos (fotos e arquivos) dos pedidos.
// O arquivo fica em Back/uploads/<arquivo>; a tabela guarda só os dados dele.
const AnexosPedido = sequelize.define(
  'AnexosPedido',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idPedido: { type: DataTypes.INTEGER, allowNull: false },
    nomeOriginal: { type: DataTypes.STRING(255), allowNull: false },
    arquivo: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    tipo: { type: DataTypes.STRING(100), allowNull: false },
    tamanho: { type: DataTypes.INTEGER, allowNull: false },
    dataEnvio: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    idUsuario: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: 'anexos_pedido',
    timestamps: false,
    underscored: true, // nomeOriginal (JS) <-> nome_original (banco), etc.
  }
);

AnexosPedido.belongsTo(Pedidos, { foreignKey: 'idPedido', as: 'pedido' });
Pedidos.hasMany(AnexosPedido, { foreignKey: 'idPedido', as: 'anexos' });
AnexosPedido.belongsTo(Usuario, { foreignKey: 'idUsuario', as: 'usuario' });

module.exports = AnexosPedido;
