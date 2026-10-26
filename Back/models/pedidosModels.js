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
    // FK de verdade para a tabela "clientes".
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
    // SPV-118: quem liberou o pedido para cliente inadimplente, e por quê
    idLiberadoPor: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    motivoLiberacao: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // SPV-73: desconto. total = subtotal (soma dos itens) - valorDesconto
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    descontoTipo: {
      type: DataTypes.STRING(10), // 'valor' (R$) | 'percentual' (%) | null = sem desconto
      allowNull: true,
      validate: { isIn: { args: [['valor', 'percentual']], msg: 'Tipo de desconto inválido.' } },
    },
    descontoInformado: {
      type: DataTypes.DECIMAL(10, 2), // número digitado: R$ ou %
      allowNull: false,
      defaultValue: 0,
    },
    valorDesconto: {
      type: DataTypes.DECIMAL(10, 2), // quanto o desconto deu em R$
      allowNull: false,
      defaultValue: 0,
    },
    motivoDesconto: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    idDescontoPor: {
      type: DataTypes.INTEGER,
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
Pedidos.belongsTo(Usuario, { foreignKey: 'idLiberadoPor', as: 'liberadoPor' }); // SPV-118
Pedidos.belongsTo(Usuario, { foreignKey: 'idDescontoPor', as: 'descontoPor' }); // SPV-73

module.exports = Pedidos;
