import api from './api'

/*
 * SPV-101 — Dashboard gerencial (REQ018). Os números vêm prontos do Back (GET /dashboard).
 * SPV-79 — Indicadores gerenciais no Power BI (REQ035): painel publicado pelo grupo,
 * mostrado dentro do sistema (aba "Power BI" do Dashboard).
 */

// Link "Publicar na Web" do Power BI. Para trocar, crie VITE_POWERBI_URL no .env.local do Front.
export const POWERBI_URL =
  import.meta.env.VITE_POWERBI_URL ||
  'https://app.powerbi.com/view?r=eyJrIjoiNjcxMTk0NzctYWY3My00MDkwLWE4NmQtNGEzOGRhZmFmYTYzIiwidCI6IjAyYjAyZmVhLWI0YmMtNGFmOS1iOWNiLTk2MmFkZmFkZjI1ZCJ9'

// Tamanho original do painel publicado (1024 x 1060): a tela mantém essa proporção
export const POWERBI_PROPORCAO = '1024 / 1060'

const n = (v) => Number(v ?? 0)

export async function carregarDashboard(mes) {
  const { data } = await api.get('/dashboard', { params: mes ? { mes } : {} })
  return {
    mes: data.mes,
    periodo: data.periodo,
    vendas: {
      faturamento: n(data.vendas.faturamento),
      pedidos: n(data.vendas.pedidos),
      ticketMedio: n(data.vendas.ticketMedio),
      cancelados: n(data.vendas.cancelados),
      faturamentoMesAnterior: n(data.vendas.faturamentoMesAnterior),
      variacao: data.vendas.variacao === null ? null : n(data.vendas.variacao),
    },
    caixa: {
      entradas: n(data.caixa.entradas),
      saidas: n(data.caixa.saidas),
      saldo: n(data.caixa.saldo),
    },
    porMes: data.porMes.map((m) => ({
      ...m,
      faturamento: n(m.faturamento),
      ticketMedio: n(m.ticketMedio),
    })),
    porDia: data.porDia.map((d) => ({ ...d, faturamento: n(d.faturamento) })),
    topClientes: data.topClientes.map((c) => ({ ...c, faturamento: n(c.faturamento) })),
    situacao: data.situacao,
    producao: data.producao,
  }
}
