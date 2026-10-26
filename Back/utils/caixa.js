// SPV-84/97 — regras do caixa usadas pelo caixaControllers e pelas contas a pagar/receber
const { Op } = require('sequelize');
const Caixa = require('../models/caixaModels');
const FechamentosCaixa = require('../models/fechamentosCaixaModels');
const { hojeISO, falhar } = require('./financeiro');

const dois = (n) => String(n).padStart(2, '0');

// Date -> "AAAA-MM-DD" no fuso do servidor
function diaDe(data) {
  const d = new Date(data);
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

// "AAAA-MM-DD" -> [00:00:00, 23:59:59.999] no fuso do servidor
function intervaloDoDia(dia) {
  return { inicio: new Date(`${dia}T00:00:00`), fim: new Date(`${dia}T23:59:59.999`) };
}

// Lançamento de hoje fica com a hora atual; de outro dia (recebimento com data passada), meio-dia
function momentoDoLancamento(dia) {
  return !dia || dia === hojeISO() ? new Date() : new Date(`${dia}T12:00:00`);
}

const formatarDia = (dia) => dia.split('-').reverse().join('/');

// Dia já fechado não aceita lançamento novo, exclusão nem estorno
async function garantirCaixaAberto(dia, transaction) {
  const fechamento = await FechamentosCaixa.findOne({ where: { data: dia }, transaction });
  if (fechamento) {
    falhar(
      `O caixa de ${formatarDia(dia)} já foi fechado. Lance a correção no caixa de hoje (lançamento manual).`,
      409,
    );
  }
}

// Saída em dinheiro não pode passar do dinheiro que existe na gaveta naquele dia
async function garantirDinheiroDisponivel(dia, valor) {
  const { resumo } = await resumoDoDia(dia);
  if (Math.round(Number(valor) * 100) > Math.round(resumo.dinheiroEsperado * 100)) {
    const disponivel = Math.max(0, resumo.dinheiroEsperado).toFixed(2).replace('.', ',');
    falhar(
      `Não há dinheiro suficiente no caixa (disponível: R$ ${disponivel}). Use outra forma de pagamento ou lance um suprimento (entrada em dinheiro) antes.`,
      409,
    );
  }
}

// Recebimento/pagamento de conta -> lançamento no caixa do dia (SPV-97)
async function registrarNoCaixa(dados, transaction) {
  const dia = dados.dia || hojeISO();
  await garantirCaixaAberto(dia, transaction);
  if (dados.tipo === 'saida' && dados.formaPagamento === 'dinheiro') {
    await garantirDinheiroDisponivel(dia, dados.valor);
  }
  return Caixa.create(
    {
      data: momentoDoLancamento(dia),
      tipo: dados.tipo,
      formaPagamento: dados.formaPagamento,
      valor: dados.valor,
      descricao: dados.descricao,
      idPedido: dados.idPedido ?? null,
      idContaReceber: dados.idContaReceber ?? null,
      idContaPagar: dados.idContaPagar ?? null,
      idUsuario: dados.idUsuario,
    },
    { transaction },
  );
}

// Desfazer recebimento/pagamento -> apaga o lançamento que ele gerou (se o dia ainda estiver aberto)
async function removerDoCaixa(where, transaction) {
  const lancamentos = await Caixa.findAll({ where, transaction });
  for (const l of lancamentos) {
    await garantirCaixaAberto(diaDe(l.data), transaction);
    await l.destroy({ transaction });
  }
}

const somar = (lista) => Math.round(lista.reduce((s, l) => s + Number(l.valor), 0) * 100) / 100;

// Lançamentos e totais de um dia (SPV-97: entradas separadas por forma de pagamento)
async function resumoDoDia(dia, include) {
  const { inicio, fim } = intervaloDoDia(dia);
  const lancamentos = await Caixa.findAll({
    where: { data: { [Op.between]: [inicio, fim] } },
    include,
    order: [['data', 'ASC'], ['id', 'ASC']],
  });
  const anterior = await FechamentosCaixa.findOne({
    where: { data: { [Op.lt]: dia } },
    order: [['data', 'DESC']],
  });
  const entradas = lancamentos.filter((l) => l.tipo === 'entrada');
  const saidas = lancamentos.filter((l) => l.tipo === 'saida');
  const da = (lista, forma) => somar(lista.filter((l) => l.formaPagamento === forma));

  const saldoInicial = anterior ? Number(anterior.dinheiroContado) : 0;
  const resumo = {
    saldoInicial,
    entradas: {
      dinheiro: da(entradas, 'dinheiro'),
      pix: da(entradas, 'pix'),
      cartao: da(entradas, 'cartao'),
      total: somar(entradas),
    },
    saidas: {
      dinheiro: da(saidas, 'dinheiro'),
      outras: somar(saidas.filter((l) => l.formaPagamento !== 'dinheiro')),
      total: somar(saidas),
    },
  };
  resumo.dinheiroEsperado = Math.round((saldoInicial + resumo.entradas.dinheiro - resumo.saidas.dinheiro) * 100) / 100;
  resumo.saldoDoDia = Math.round((resumo.entradas.total - resumo.saidas.total) * 100) / 100;
  return { lancamentos, resumo, ultimoFechamento: anterior ? anterior.data : null };
}

module.exports = {
  diaDe,
  intervaloDoDia,
  garantirCaixaAberto,
  garantirDinheiroDisponivel,
  registrarNoCaixa,
  removerDoCaixa,
  resumoDoDia,
};
