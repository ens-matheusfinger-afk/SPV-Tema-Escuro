import { exportarExcel, nomeComData } from '../../utils/exportarExcel'
import { FORMAS_PAGAMENTO, situacaoConta } from '../../services/financeiroService'
import { STATUS_PEDIDO } from '../../utils/constants'

/*
 * SPV-102 — exportação do financeiro para Excel.
 * Cada tela exporta o que está aparecendo (com os filtros aplicados).
 */

const SITUACOES = {
  quitada: 'Quitada',
  vencida: 'Vencida',
  'pedido-atrasado': 'Entrega atrasada',
  'vence-hoje': 'Vence hoje',
  'vence-logo': 'Vence em até 3 dias',
  'a-vencer': 'A vencer',
  'sem-vencimento': 'Sem vencimento',
}
const forma = (f) => (f ? (FORMAS_PAGAMENTO[f]?.nome ?? f) : '')

export async function exportarContasPagar(contas) {
  await exportarExcel(nomeComData('contas-a-pagar'), [
    {
      aba: 'Contas a pagar',
      linhas: contas,
      colunas: [
        { titulo: 'Nº', tipo: 'inteiro', valor: (c) => c.id, largura: 7 },
        { titulo: 'Vencimento', tipo: 'data', valor: (c) => c.vencimento, largura: 12 },
        { titulo: 'Descrição', valor: (c) => c.descricao, largura: 32 },
        { titulo: 'Categoria', valor: (c) => c.categoria, largura: 18 },
        { titulo: 'Fornecedor', valor: (c) => c.fornecedor, largura: 22 },
        { titulo: 'Valor', tipo: 'moeda', valor: (c) => c.valor, largura: 14 },
        { titulo: 'Situação', valor: (c) => SITUACOES[situacaoConta(c)], largura: 18 },
        { titulo: 'Pago em', tipo: 'data', valor: (c) => c.pagamento, largura: 12 },
        { titulo: 'Forma', valor: (c) => forma(c.forma), largura: 14 },
      ],
    },
  ])
}

export async function exportarContasReceber(contas) {
  await exportarExcel(nomeComData('contas-a-receber'), [
    {
      aba: 'Contas a receber',
      linhas: contas,
      colunas: [
        { titulo: 'Nº', tipo: 'inteiro', valor: (c) => c.id, largura: 7 },
        { titulo: 'Vencimento', tipo: 'data', valor: (c) => c.vencimento, largura: 12 },
        { titulo: 'Cliente', valor: (c) => c.cliente?.nome, largura: 28 },
        {
          titulo: 'Origem',
          valor: (c) => (c.idPedido ? `Pedido nº ${c.idPedido}` : 'Avulsa'),
          largura: 14,
        },
        {
          titulo: 'Status do pedido',
          valor: (c) => (c.pedido ? STATUS_PEDIDO[c.pedido.status]?.nome : ''),
          largura: 22,
        },
        {
          titulo: 'Descrição',
          valor: (c) => (c.idPedido ? c.pedido?.descricao : c.descricao),
          largura: 30,
        },
        { titulo: 'Valor', tipo: 'moeda', valor: (c) => c.valor, largura: 14 },
        { titulo: 'Situação', valor: (c) => SITUACOES[situacaoConta(c)], largura: 18 },
        { titulo: 'Recebido em', tipo: 'data', valor: (c) => c.recebimento, largura: 12 },
        { titulo: 'Forma', valor: (c) => forma(c.forma), largura: 12 },
      ],
    },
  ])
}

const ORIGEM = { receber: 'Conta a receber', pagar: 'Conta a pagar', manual: 'Lançamento manual' }

const COLUNAS_LANCAMENTOS = [
  { titulo: 'Data e hora', tipo: 'dataHora', valor: (l) => l.data, largura: 17 },
  { titulo: 'Tipo', valor: (l) => (l.tipo === 'entrada' ? 'Entrada' : 'Saída'), largura: 9 },
  { titulo: 'Forma', valor: (l) => forma(l.forma), largura: 14 },
  { titulo: 'Descrição', valor: (l) => l.descricao, largura: 44 },
  { titulo: 'Origem', valor: (l) => ORIGEM[l.origem], largura: 18 },
  // saídas com sinal negativo: a soma da coluna dá o saldo
  {
    titulo: 'Valor',
    tipo: 'moeda',
    valor: (l) => (l.tipo === 'entrada' ? l.valor : -l.valor),
    largura: 14,
  },
  { titulo: 'Usuário', valor: (l) => l.usuario, largura: 18 },
]

// Caixa de um dia: lançamentos + resumo por forma de pagamento (SPV-97)
export async function exportarCaixaDoDia(caixa) {
  const r = caixa.resumo
  const resumo = [
    ['Dinheiro no início do dia', r.saldoInicial],
    ['Entradas em dinheiro', r.entradas.dinheiro],
    ['Entradas em PIX', r.entradas.pix],
    ['Entradas em cartão', r.entradas.cartao],
    ['Total de entradas', r.entradas.total],
    ['Saídas em dinheiro', r.saidas.dinheiro],
    ['Saídas em outras formas', r.saidas.outras],
    ['Total de saídas', r.saidas.total],
    ['Dinheiro esperado na gaveta', r.dinheiroEsperado],
    ...(caixa.fechamento
      ? [
          ['Dinheiro contado no fechamento', caixa.fechamento.dinheiroContado],
          ['Diferença (contado − esperado)', caixa.fechamento.diferenca],
        ]
      : []),
  ].map(([item, valor]) => ({ item, valor }))
  await exportarExcel(`caixa-${caixa.data}`, [
    { aba: 'Lançamentos', linhas: caixa.lancamentos, colunas: COLUNAS_LANCAMENTOS },
    {
      aba: 'Resumo do dia',
      linhas: resumo,
      colunas: [
        { titulo: 'Item', valor: (l) => l.item, largura: 34 },
        { titulo: 'Valor', tipo: 'moeda', valor: (l) => l.valor, largura: 16 },
      ],
    },
  ])
}

export async function exportarFechamentos(fechamentos) {
  await exportarExcel(nomeComData('fechamentos-de-caixa'), [
    {
      aba: 'Fechamentos',
      linhas: fechamentos,
      colunas: [
        { titulo: 'Dia', tipo: 'data', valor: (f) => f.data, largura: 12 },
        { titulo: 'Dinheiro inicial', tipo: 'moeda', valor: (f) => f.saldoInicial, largura: 14 },
        {
          titulo: 'Entradas dinheiro',
          tipo: 'moeda',
          valor: (f) => f.entradasDinheiro,
          largura: 15,
        },
        { titulo: 'Entradas PIX', tipo: 'moeda', valor: (f) => f.entradasPix, largura: 14 },
        { titulo: 'Entradas cartão', tipo: 'moeda', valor: (f) => f.entradasCartao, largura: 14 },
        { titulo: 'Saídas dinheiro', tipo: 'moeda', valor: (f) => f.saidasDinheiro, largura: 14 },
        { titulo: 'Saídas outras', tipo: 'moeda', valor: (f) => f.saidasOutras, largura: 14 },
        { titulo: 'Esperado', tipo: 'moeda', valor: (f) => f.dinheiroEsperado, largura: 14 },
        { titulo: 'Contado', tipo: 'moeda', valor: (f) => f.dinheiroContado, largura: 14 },
        { titulo: 'Diferença', tipo: 'moeda', valor: (f) => f.diferenca, largura: 13 },
        { titulo: 'Observação', valor: (f) => f.observacao, largura: 34 },
        { titulo: 'Fechado por', valor: (f) => f.usuario, largura: 18 },
        { titulo: 'Fechado em', tipo: 'dataHora', valor: (f) => f.fechadoEm, largura: 17 },
      ],
    },
  ])
}

// SPV-81 — relatório de fluxo de caixa do período
export async function exportarFluxoCaixa(f) {
  const forma = (n) => FORMAS_PAGAMENTO[n]?.nome ?? n
  const resumo = [
    ['Período', `${f.de.split('-').reverse().join('/')} a ${f.ate.split('-').reverse().join('/')}`],
    ['Saldo anterior', f.saldoAnterior],
    ['Entradas', f.totais.entradas],
    ['Saídas', f.totais.saidas],
    ['Resultado do período', f.totais.resultado],
    ['Saldo final', f.totais.saldoFinal],
    ...f.porForma.entrada.map((x) => [`Entradas em ${forma(x.nome)}`, x.valor]),
    ...f.porForma.saida.map((x) => [`Saídas em ${forma(x.nome)}`, x.valor]),
    ...f.porOrigem.map((x) => [x.nome, x.valor]),
    ...f.porCategoria.map((x) => [`Despesa: ${x.nome}`, x.valor]),
  ]
  await exportarExcel(`fluxo-de-caixa-${f.de}-a-${f.ate}`, [
    {
      aba: 'Resumo',
      linhas: resumo,
      colunas: [
        { titulo: 'Item', valor: (l) => l[0], largura: 40 },
        {
          titulo: 'Valor',
          tipo: 'moeda',
          valor: (l) => (typeof l[1] === 'number' ? l[1] : null),
          largura: 16,
        },
        { titulo: '', valor: (l) => (typeof l[1] === 'string' ? l[1] : ''), largura: 26 },
      ],
    },
    {
      aba: 'Dia a dia',
      linhas: f.porDia,
      colunas: [
        { titulo: 'Dia', tipo: 'data', valor: (d) => d.dia, largura: 12 },
        { titulo: 'Entradas', tipo: 'moeda', valor: (d) => d.entradas, largura: 14 },
        { titulo: 'Saídas', tipo: 'moeda', valor: (d) => d.saidas, largura: 14 },
        { titulo: 'Saldo do dia', tipo: 'moeda', valor: (d) => d.saldoDia, largura: 14 },
        { titulo: 'Saldo acumulado', tipo: 'moeda', valor: (d) => d.acumulado, largura: 16 },
        { titulo: 'Lançamentos', tipo: 'inteiro', valor: (d) => d.lancamentos, largura: 12 },
      ],
    },
    {
      aba: 'Lançamentos',
      linhas: f.lancamentos,
      colunas: [
        { titulo: 'Data', tipo: 'dataHora', valor: (l) => l.data, largura: 17 },
        { titulo: 'Tipo', valor: (l) => (l.tipo === 'entrada' ? 'Entrada' : 'Saída'), largura: 9 },
        { titulo: 'Descrição', valor: (l) => l.descricao, largura: 40 },
        { titulo: 'Categoria', valor: (l) => l.categoria, largura: 18 },
        { titulo: 'Forma', valor: (l) => (l.forma ? forma(l.forma) : ''), largura: 14 },
        {
          titulo: 'Valor',
          tipo: 'moeda',
          valor: (l) => (l.tipo === 'entrada' ? l.valor : -l.valor),
          largura: 14,
        },
        { titulo: 'Usuário', valor: (l) => l.usuario, largura: 18 },
      ],
    },
  ])
}
