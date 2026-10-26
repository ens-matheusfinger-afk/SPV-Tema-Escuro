const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./usuariosModels');
const Pedidos = require('./pedidosModels');
const ContasPagar = require('./contasPagarModels');

// REQ013 - Módulo de Fechamento de Caixa
// Cada linha é 1 lançamento (entrada ou saída) do dia - não 1 registro por dia.
// O fechamento diário é calculado somando os lançamentos de uma data (ver
// GET /caixa/fechamento no controller).
const Caixa = sequelize.define(
  'Caixa',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    data: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'entrada' (venda/recebimento) ou 'saida' (despesa do dia)
    tipo: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        isIn: { args: [['entrada', 'saida']], msg: "tipo deve ser 'entrada' ou 'saida'." },
      },
    },
    // obrigatória para entradas; boleto/transferência só aparecem em saídas (pagamento de contas)
    formaPagamento: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: {
          args: [['dinheiro', 'pix', 'cartao', 'boleto', 'transferencia']],
          msg: 'Forma de pagamento inválida.',
        },
      },
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: { args: [0.01], msg: 'O valor deve ser maior que zero.' },
      },
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // Preenchido quando a entrada vem de uma venda (pedido finalizado); nulo em despesas avulsas
    idPedido: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Pedidos, key: 'id' },
    },
    idUsuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Usuario, key: 'id' },
    },
    // SPV-97: de qual conta veio o lançamento (recebimento de conta a receber / pagamento de conta a pagar)
    idContaReceber: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    idContaPagar: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: 'caixa',
    timestamps: false,
    underscored: true, // formaPagamento (JS) <-> forma_pagamento (coluna no banco), etc.
  }
);

Caixa.belongsTo(Usuario, { foreignKey: 'idUsuario', as: 'usuario' });
Caixa.belongsTo(Pedidos, { foreignKey: 'idPedido', as: 'pedido' });
// SPV-81: categoria da despesa no fluxo de caixa (pagamento de conta a pagar)
Caixa.belongsTo(ContasPagar, { foreignKey: 'idContaPagar', as: 'contaPagar', constraints: false });

module.exports = Caixa;
