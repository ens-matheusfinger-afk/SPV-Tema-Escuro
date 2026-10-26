import { exportarExcel } from '../../utils/exportarExcel'
import { STATUS_PEDIDO } from '../../utils/constants'

// SPV-101 + REQ019 — exporta os indicadores do mês do Dashboard para Excel
export function exportarDashboard(d) {
  const resumo = [
    ['Faturamento (pedidos do mês, sem cancelados)', d.vendas.faturamento, 'moeda'],
    ['Faturamento do mês anterior', d.vendas.faturamentoMesAnterior, 'moeda'],
    ['Pedidos no mês', d.vendas.pedidos, 'inteiro'],
    ['Pedidos cancelados no mês', d.vendas.cancelados, 'inteiro'],
    ['Ticket médio', d.vendas.ticketMedio, 'moeda'],
    ['Entradas no caixa', d.caixa.entradas, 'moeda'],
    ['Saídas no caixa', d.caixa.saidas, 'moeda'],
    ['Saldo do caixa no mês', d.caixa.saldo, 'moeda'],
    ['Pedidos em andamento (agora)', d.situacao.emAndamento, 'inteiro'],
    ['Pedidos com entrega atrasada (agora)', d.situacao.atrasados, 'inteiro'],
    ['Peças produzidas no mês', d.producao.pecas, 'inteiro'],
    ['Minutos de produção no mês', d.producao.minutos, 'inteiro'],
  ]
  return exportarExcel(`dashboard-${d.mes}`, [
    {
      aba: 'Resumo',
      linhas: resumo,
      colunas: [
        { titulo: 'Indicador', valor: (l) => l[0], largura: 44 },
        { titulo: 'Valor', tipo: 'numero', valor: (l) => l[1], largura: 16 },
      ],
    },
    {
      aba: 'Por mês',
      linhas: d.porMes,
      colunas: [
        { titulo: 'Mês', valor: (m) => m.mes, largura: 10 },
        { titulo: 'Faturamento', tipo: 'moeda', valor: (m) => m.faturamento, largura: 16 },
        { titulo: 'Pedidos', tipo: 'inteiro', valor: (m) => m.pedidos, largura: 10 },
        { titulo: 'Ticket médio', tipo: 'moeda', valor: (m) => m.ticketMedio, largura: 14 },
      ],
    },
    {
      aba: 'Por dia',
      linhas: d.porDia,
      colunas: [
        { titulo: 'Dia', tipo: 'data', valor: (x) => x.dia, largura: 12 },
        { titulo: 'Faturamento', tipo: 'moeda', valor: (x) => x.faturamento, largura: 16 },
        { titulo: 'Pedidos', tipo: 'inteiro', valor: (x) => x.pedidos, largura: 10 },
      ],
    },
    {
      aba: 'Clientes',
      linhas: d.topClientes,
      colunas: [
        { titulo: 'Cliente', valor: (c) => c.nome, largura: 32 },
        { titulo: 'Faturamento', tipo: 'moeda', valor: (c) => c.faturamento, largura: 16 },
        { titulo: 'Pedidos', tipo: 'inteiro', valor: (c) => c.pedidos, largura: 10 },
      ],
    },
    {
      aba: 'Produção',
      linhas: d.producao.porOperador,
      colunas: [
        { titulo: 'Operador', valor: (o) => o.nome, largura: 28 },
        { titulo: 'Peças', tipo: 'inteiro', valor: (o) => o.pecas, largura: 10 },
        { titulo: 'Minutos', tipo: 'inteiro', valor: (o) => o.minutos, largura: 10 },
        { titulo: 'Apontamentos', tipo: 'inteiro', valor: (o) => o.apontamentos, largura: 13 },
      ],
    },
    {
      aba: 'Em andamento',
      linhas: d.situacao.porStatus,
      colunas: [
        { titulo: 'Status', valor: (s) => STATUS_PEDIDO[s.status].nome, largura: 26 },
        { titulo: 'Pedidos', tipo: 'inteiro', valor: (s) => s.quantidade, largura: 10 },
      ],
    },
  ])
}
