const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Pedidos = require('./pedidosModels');
const Produtos = require('./produtosModels');
const Servicos = require('./servicosModels');

// Cada item de pedido é OU um produto OU um serviço (REQ004).
const ItensPedido = sequelize.define(
  'ItensPedido',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    idPedido: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Pedidos, key: 'id' },
    },
    // 'produto' ou 'servico' - diz qual das duas FKs abaixo está preenchida
    tipoItem: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        isIn: { args: [['produto', 'servico']], msg: "tipoItem deve ser 'produto' ou 'servico'." },
      },
    },
    idProduto: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Produtos, key: 'id' },
    },
    idServico: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Servicos, key: 'id' },
    },
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: { args: [1], msg: 'A quantidade deve ser maior que zero.' },
      },
    },
    // Preço no momento da venda (snapshot). O preço do produto/serviço pode
    // mudar depois, mas o valor do pedido já fechado não deve ser afetado.
    valorUnitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: 'itens_pedido',
    timestamps: false,
    underscored: true,
  }
);

ItensPedido.belongsTo(Pedidos, { foreignKey: 'idPedido', as: 'pedido' });
Pedidos.hasMany(ItensPedido, { foreignKey: 'idPedido', as: 'itens' });

ItensPedido.belongsTo(Produtos, { foreignKey: 'idProduto', as: 'produto' });
ItensPedido.belongsTo(Servicos, { foreignKey: 'idServico', as: 'servico' });

module.exports = ItensPedido;
