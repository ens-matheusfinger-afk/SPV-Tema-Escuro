const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./usuariosModels');

// SPV-84 — fechamento do caixa: um registro por dia, com os totais e a conferência do dinheiro
const FechamentosCaixa = sequelize.define(
  'FechamentosCaixa',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    data: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
    saldoInicial: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    entradasDinheiro: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    entradasPix: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    entradasCartao: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    saidasDinheiro: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    saidasOutras: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    dinheiroEsperado: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    dinheiroContado: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    diferenca: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    observacao: { type: DataTypes.STRING(255), allowNull: true },
    idUsuario: { type: DataTypes.INTEGER, allowNull: false },
    fechadoEm: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'fechamentos_caixa',
    timestamps: false,
    underscored: true,
  },
);

FechamentosCaixa.belongsTo(Usuario, { foreignKey: 'idUsuario', as: 'usuario' });

module.exports = FechamentosCaixa;
