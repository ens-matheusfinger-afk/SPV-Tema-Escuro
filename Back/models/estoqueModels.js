const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Produtos = require('./produtosModels');

// REQ017 - Controle de Estoque de Produtos para Venda
// Cada produto com controlaEstoque = true tem exatamente 1 registro de estoque,
// que guarda o saldo atual e os limites mínimo/máximo.
const Estoque = sequelize.define(
  'Estoque',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    idProduto: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // 1 estoque por produto
      references: {
        model: Produtos,
        key: 'id',
      },
    },
    estoqueAtual: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'O estoque atual não pode ser negativo.' },
      },
    },
    estoqueMinimo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    estoqueMaximo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: 'estoque',
    timestamps: false,
    underscored: true, // idProduto/estoqueAtual (JS) <-> id_produto/estoque_atual (colunas no banco)
  }
);

// Relacionamento com Produtos (join nas consultas via { include: ... })
Estoque.belongsTo(Produtos, { foreignKey: 'idProduto', as: 'produto' });
Produtos.hasOne(Estoque, { foreignKey: 'idProduto', as: 'estoque' });

module.exports = Estoque;
