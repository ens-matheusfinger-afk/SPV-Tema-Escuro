const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// REQ006 - Cadastro de Serviços
// Assim como Produtos, é um item que pode ser adicionado a um pedido (itensPedido),
// mas não tem controle de estoque - em vez disso, tem uma duração estimada,
// que serve tanto para orçar o pedido quanto para o módulo de produção (M.E.S. - REQ010).
const Servicos = sequelize.define(
  'Servicos',
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
        notEmpty: { msg: 'O nome do serviço é obrigatório.' },
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
    // Campo que diferencia Serviço de Produto: tempo estimado (em minutos) para
    // executar o serviço. Não existe em Produtos, que usa controlaEstoque no lugar.
    duracaoEstimada: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: { args: [0], msg: 'A duração estimada não pode ser negativa.' },
      },
    },
  },
  {
    tableName: 'servicos',
    timestamps: false,
    underscored: true, // duracaoEstimada (JS) <-> duracao_estimada (coluna no banco, sem aspas)
  }
);

module.exports = Servicos;
