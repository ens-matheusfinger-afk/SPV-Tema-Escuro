// SPV-118 / SPV-58 — quem está devendo
// Inadimplente = tem conta a receber EM ABERTO e VENCIDA que seja:
//   - avulsa (sem pedido), ou
//   - de pedido já ENTREGUE (status 5).
// Pedido ainda não entregue com a data passada NÃO conta: o atraso é da empresa, não do cliente.
const { Op } = require('sequelize');
const ContasReceber = require('../models/contasReceberModels');
const Pedidos = require('../models/pedidosModels');
const Cliente = require('../models/clientesModels');
const { hojeISO } = require('./financeiro');

const STATUS_FINALIZADO = 5;

// Map idCliente -> { idCliente, nome, totalVencido, contas: [...] }
async function contasVencidasPorCliente(idCliente) {
  const where = { dataRecebimento: null, dataPrevisao: { [Op.lt]: hojeISO() } };
  if (idCliente) where.idCliente = idCliente;
  const contas = await ContasReceber.findAll({
    where,
    include: [
      { model: Pedidos, as: 'pedido', attributes: ['id', 'status', 'descricao'] },
      { model: Cliente, as: 'cliente', attributes: ['id', 'nome', 'telefone'] },
    ],
    order: [['dataPrevisao', 'ASC']],
  });
  const porCliente = new Map();
  for (const c of contas) {
    if (c.idPedido && c.pedido?.status !== STATUS_FINALIZADO) continue;
    if (!porCliente.has(c.idCliente)) {
      porCliente.set(c.idCliente, {
        idCliente: c.idCliente,
        nome: c.cliente?.nome ?? '',
        telefone: c.cliente?.telefone ?? '',
        totalVencido: 0,
        contas: [],
      });
    }
    const r = porCliente.get(c.idCliente);
    r.totalVencido = Math.round((r.totalVencido + Number(c.total)) * 100) / 100;
    r.contas.push({
      id: c.id,
      descricao: c.descricao,
      valor: Number(c.total),
      vencimento: c.dataPrevisao,
      idPedido: c.idPedido,
    });
  }
  return porCliente;
}

module.exports = { contasVencidasPorCliente };
