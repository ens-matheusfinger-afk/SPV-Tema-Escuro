const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// REQ007 - Cadastro de Produtos
// Corresponde à entidade "produtos" do Diagrama de Classes do Documento de Visão.
const Produtos = sequelize.define(
  'Produtos',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nome: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'O nome do produto é obrigatório.' },
      },
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: { msg: 'O valor deve ser numérico.' },
        min: 0,
      },
    },
    // Indica se o produto participa do controle de estoque (produto de estoque)
    // ou é um item de confecção/sob encomenda, sem controle de saldo (REQ007).
    controlaEstoque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: 'produtos',
    timestamps: false, // a tabela criada em DATABASE/tabelaProdutos não tem createdAt/updatedAt
    underscored: true, // controlaEstoque (JS) <-> controla_estoque (coluna no banco, sem aspas)
  }
);

module.exports = Produtos;
