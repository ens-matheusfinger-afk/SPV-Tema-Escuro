const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./usuariosModels');
const Cliente = require('./clientesModels');

// REQ004 - Gerar Pedidos / REQ005 - Alterar estado do pedido
// status segue o Diagrama de Máquina de Estados "Venda até a entrega":
//   1 = Cadastro do pedido | 2 = Em produção | 3 = Aguardando conferência
//   4 = Aguardando cliente | 5 = Entregue/Finalizado | 6 = Cancelado
const Pedidos = sequelize.define(
  'Pedidos',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // Agora com FK de verdade - a tabela "clientes" (do Felipe) já foi mesclada.
    idCliente: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Cliente,
        key: 'id',
      },
    },
    idVendedor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Usuario,
        key: 'id',
      },
    },
    dataCriacao: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    dataEntregaPrevista: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dataEntregaRealizada: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        isIn: { args: [[1, 2, 3, 4, 5, 6]], msg: 'Status inválido (use 1 a 6).' },
      },
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    anexo: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'pedidos',
    timestamps: false,
    underscored: true, // idCliente (JS) <-> id_cliente (coluna no banco), etc.
  }
);

Pedidos.belongsTo(Usuario, { foreignKey: 'idVendedor', as: 'vendedor' });
Pedidos.belongsTo(Cliente, { foreignKey: 'idCliente', as: 'cliente' });

module.exports = Pedidos;
