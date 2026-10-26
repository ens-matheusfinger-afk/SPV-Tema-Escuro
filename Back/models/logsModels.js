const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// SPV-111 / REQ028 — registro de logs das operações relevantes (tabela logs)
const Logs = sequelize.define(
  'Logs',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    dataHora: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    idUsuario: { type: DataTypes.INTEGER, allowNull: true },
    usuarioNome: { type: DataTypes.STRING(100), allowNull: true },
    modulo: { type: DataTypes.STRING(30), allowNull: false },
    acao: { type: DataTypes.STRING(40), allowNull: false },
    descricao: { type: DataTypes.STRING(500), allowNull: false },
    entidade: { type: DataTypes.STRING(30), allowNull: true },
    idEntidade: { type: DataTypes.INTEGER, allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    detalhes: { type: DataTypes.JSONB, allowNull: true },
  },
  {
    tableName: 'logs',
    timestamps: false,
    underscored: true, // dataHora (JS) <-> data_hora (banco), etc.
  }
);

module.exports = Logs;
