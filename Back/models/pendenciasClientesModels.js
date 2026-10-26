const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/*
 * SPV-58 — model da VIEW vw_pendencias_clientes (DATABASE/viewPendenciasClientes.sql).
 * Só leitura: os números são calculados pelo banco a partir de clientes, pedidos e
 * contas a receber. Nunca use create/update/destroy aqui (uma View não guarda dados).
 */
const PendenciasClientes = sequelize.define(
  'PendenciasClientes',
  {
    idCliente: { type: DataTypes.INTEGER, primaryKey: true },
    nome: { type: DataTypes.STRING(150) },
    telefone: { type: DataTypes.STRING(255) },
    fatorConfianca: { type: DataTypes.SMALLINT },
    clienteAtivo: { type: DataTypes.BOOLEAN },
    valorVencido: { type: DataTypes.DECIMAL(10, 2) },
    contasVencidas: { type: DataTypes.INTEGER },
    valorAReceber: { type: DataTypes.DECIMAL(10, 2), field: 'valor_a_receber' },
    pedidosProntos: { type: DataTypes.INTEGER },
    idsPedidosProntos: { type: DataTypes.ARRAY(DataTypes.INTEGER) },
    pedidosEmAndamento: { type: DataTypes.INTEGER },
    inadimplente: { type: DataTypes.BOOLEAN },
  },
  {
    tableName: 'vw_pendencias_clientes',
    timestamps: false,
    underscored: true,
  },
);

module.exports = PendenciasClientes;
