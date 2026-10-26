const { Op } = require('sequelize');
const Pedidos = require('../models/pedidosModels');
const Caixa = require('../models/caixaModels');
const Cliente = require('../models/clientesModels');
const Usuario = require('../models/usuariosModels');
const ApontamentosProducao = require('../models/apontamentosProducaoModels');
const { hojeISO, falhar, responderErro } = require('../utils/financeiro');
const { diaDe } = require('../utils/caixa');

/*
 * SPV-101 — Dashboard gerencial (REQ018): faturamento, pedidos, ticket médio, produção.
 * Tudo calculado na hora a partir do banco (pedidos, caixa, apontamentos).
 *
 * Faturamento = soma do total dos pedidos criados no mês, sem os cancelados (o que foi vendido).
 * Recebido / pago = entradas e saídas do caixa no mês (o dinheiro que entrou e saiu de fato).
 */

const dois = (n) => String(n).padStart(2, '0');
const mesDe = (data) => diaDe(data).slice(0, 7);
const arred = (n) => Math.round(n * 100) / 100;

// "AAAA-MM" -> [1º dia 00:00, último dia 23:59:59.999] no fuso do servidor
function intervaloDoMes(mes) {
  const [ano, m] = mes.split('-').map(Number);
  return { inicio: new Date(ano, m - 1, 1, 0, 0, 0, 0), fim: new Date(ano, m, 0, 23, 59, 59, 999) };
}

// "AAAA-MM" deslocado N meses (N negativo = para trás)
function somarMeses(mes, n) {
  const [ano, m] = mes.split('-').map(Number);
  const d = new Date(ano, m - 1 + n, 1);
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}`;
}

function resumoVendas(pedidos) {
  const validos = pedidos.filter((p) => Number(p.status) !== 6);
  const faturamento = arred(validos.reduce((s, p) => s + Number(p.total), 0));
  return {
    faturamento,
    pedidos: validos.length,
    ticketMedio: validos.length ? arred(faturamento / validos.length) : 0,
    cancelados: pedidos.length - validos.length,
  };
}

const MESES_GRAFICO = 6;

// GET /dashboard?mes=AAAA-MM (padrão: mês atual)
exports.resumo = async (req, res) => {
  try {
    const mes = req.query.mes || hojeISO().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) falhar('Mês inválido (use AAAA-MM).');

    const { inicio, fim } = intervaloDoMes(mes);
    const inicioGrafico = intervaloDoMes(somarMeses(mes, -(MESES_GRAFICO - 1))).inicio;
    const mesAnterior = somarMeses(mes, -1);

    // Pedidos dos últimos 6 meses (o mês escolhido e o anterior saem daqui também)
    const pedidos = await Pedidos.findAll({
      attributes: ['id', 'status', 'total', 'dataCriacao', 'idCliente'],
      where: { dataCriacao: { [Op.between]: [inicioGrafico, fim] } },
      include: [{ model: Cliente, as: 'cliente', attributes: ['id', 'nome'] }],
    });
    const doMes = pedidos.filter((p) => mesDe(p.dataCriacao) === mes);
    const doAnterior = pedidos.filter((p) => mesDe(p.dataCriacao) === mesAnterior);

    const vendas = resumoVendas(doMes);
    const anterior = resumoVendas(doAnterior);
    const variacao = anterior.faturamento > 0
      ? arred(((vendas.faturamento - anterior.faturamento) / anterior.faturamento) * 100)
      : null;

    const porMes = Array.from({ length: MESES_GRAFICO }, (_, i) => {
      const m = somarMeses(mes, i - (MESES_GRAFICO - 1));
      const r = resumoVendas(pedidos.filter((p) => mesDe(p.dataCriacao) === m));
      return { mes: m, faturamento: r.faturamento, pedidos: r.pedidos, ticketMedio: r.ticketMedio };
    });

    // Faturamento por dia do mês escolhido
    const ultimoDia = fim.getDate();
    const porDia = Array.from({ length: ultimoDia }, (_, i) => ({ dia: `${mes}-${dois(i + 1)}`, faturamento: 0, pedidos: 0 }));
    for (const p of doMes) {
      if (Number(p.status) === 6) continue;
      const linha = porDia[Number(diaDe(p.dataCriacao).slice(8)) - 1];
      linha.faturamento = arred(linha.faturamento + Number(p.total));
      linha.pedidos += 1;
    }

    // Clientes que mais compraram no mês
    const porCliente = new Map();
    for (const p of doMes) {
      if (Number(p.status) === 6) continue;
      const atual = porCliente.get(p.idCliente) ?? { id: p.idCliente, nome: p.cliente?.nome ?? `Cliente ${p.idCliente}`, faturamento: 0, pedidos: 0 };
      atual.faturamento = arred(atual.faturamento + Number(p.total));
      atual.pedidos += 1;
      porCliente.set(p.idCliente, atual);
    }
    const topClientes = [...porCliente.values()].sort((a, b) => b.faturamento - a.faturamento).slice(0, 5);

    // Caixa do mês: o que entrou e saiu de fato
    const lancamentos = await Caixa.findAll({
      attributes: ['tipo', 'valor'],
      where: { data: { [Op.between]: [inicio, fim] } },
    });
    const somaCaixa = (tipo) => arred(lancamentos.filter((l) => l.tipo === tipo).reduce((s, l) => s + Number(l.valor), 0));
    const caixa = { entradas: somaCaixa('entrada'), saidas: somaCaixa('saida') };
    caixa.saldo = arred(caixa.entradas - caixa.saidas);

    // Situação atual dos pedidos em andamento (não depende do mês)
    const abertos = await Pedidos.findAll({
      attributes: ['status', 'dataEntregaPrevista'],
      where: { status: { [Op.between]: [1, 4] } },
    });
    const agora = new Date();
    const situacao = {
      porStatus: [1, 2, 3, 4].map((status) => ({ status, quantidade: abertos.filter((p) => Number(p.status) === status).length })),
      emAndamento: abertos.length,
      atrasados: abertos.filter((p) => Number(p.status) < 4 && p.dataEntregaPrevista && new Date(p.dataEntregaPrevista) < agora).length,
    };

    // Produção do mês (apontamentos encerrados no mês) — produtividade por operador (REQ010/REQ018)
    const apontamentos = await ApontamentosProducao.findAll({
      attributes: ['inicio', 'fim', 'quantidadeProduzida', 'idUsuario'],
      where: { fim: { [Op.between]: [inicio, fim] } },
      include: [{ model: Usuario, as: 'operador', attributes: ['id', 'nome'] }],
    });
    const porOperador = new Map();
    let pecas = 0;
    let minutos = 0;
    for (const a of apontamentos) {
      const min = Math.max(0, (new Date(a.fim) - new Date(a.inicio)) / 60000);
      const qtd = Number(a.quantidadeProduzida ?? 0);
      pecas += qtd;
      minutos += min;
      const atual = porOperador.get(a.idUsuario) ?? { id: a.idUsuario, nome: a.operador?.nome ?? `Usuário ${a.idUsuario}`, pecas: 0, minutos: 0, apontamentos: 0 };
      atual.pecas += qtd;
      atual.minutos += min;
      atual.apontamentos += 1;
      porOperador.set(a.idUsuario, atual);
    }
    const producao = {
      apontamentos: apontamentos.length,
      pecas,
      minutos: Math.round(minutos),
      porOperador: [...porOperador.values()]
        .map((o) => ({ ...o, minutos: Math.round(o.minutos) }))
        .sort((a, b) => b.pecas - a.pecas),
    };

    res.json({
      mes,
      periodo: { inicio: diaDe(inicio), fim: diaDe(fim) },
      vendas: { ...vendas, faturamentoMesAnterior: anterior.faturamento, variacao },
      caixa,
      porMes,
      porDia,
      topClientes,
      situacao,
      producao,
    });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao carregar o dashboard.');
  }
};
