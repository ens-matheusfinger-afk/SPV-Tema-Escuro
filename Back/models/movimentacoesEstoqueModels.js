const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Produtos = require('./produtosModels');
const Usuario = require('./usuariosModels');

// SPV-65/108/109 - Histórico de movimentações do estoque.
// quantidade tem sinal: positivo entrou, negativo saiu.
const MovimentacoesEstoque = sequelize.define(
  'MovimentacoesEstoque',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idProduto: { type: DataTypes.INTEGER, allowNull: false },
    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [['entrada', 'saida', 'ajuste', 'venda', 'devolucao']] },
    },
    quantidade: { type: DataTypes.INTEGER, allowNull: false },
    saldoAnterior: { type: DataTypes.INTEGER, allowNull: false },
    saldoAtual: { type: DataTypes.INTEGER, allowNull: false },
    motivo: { type: DataTypes.STRING(255), allowNull: true },
    idPedido: { type: DataTypes.INTEGER, allowNull: true },
    idUsuario: { type: DataTypes.INTEGER, allowNull: true },
    data: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'movimentacoes_estoque',
    timestamps: false,
    underscored: true, // saldoAnterior (JS) <-> saldo_anterior (banco), etc.
  }
);

MovimentacoesEstoque.belongsTo(Produtos, { foreignKey: 'idProduto', as: 'produto' });
MovimentacoesEstoque.belongsTo(Usuario, { foreignKey: 'idUsuario', as: 'usuario' });

/*
 * Muda o saldo de um registro de estoque E grava a movimentação, sempre juntos.
 * Todo lugar do Back que mexe no saldo usa esta função (vendas, devoluções, entradas,
 * saídas e ajustes), então o histórico nunca fica faltando.
 *   estoque: instância de Estoque | delta: quanto soma (negativo = tira)
 *   dados: { tipo, motivo?, idPedido?, idUsuario? }
 */
MovimentacoesEstoque.movimentar = async function (estoque, delta, dados) {
  if (!delta) return null;
  const saldoAnterior = estoque.estoqueAtual;
  estoque.estoqueAtual = saldoAnterior + delta;
  await estoque.save();
  return MovimentacoesEstoque.create({
    idProduto: estoque.idProduto,
    tipo: dados.tipo,
    quantidade: delta,
    saldoAnterior,
    saldoAtual: estoque.estoqueAtual,
    motivo: dados.motivo ?? null,
    idPedido: dados.idPedido ?? null,
    idUsuario: dados.idUsuario ?? null,
  });
};

module.exports = MovimentacoesEstoque;
