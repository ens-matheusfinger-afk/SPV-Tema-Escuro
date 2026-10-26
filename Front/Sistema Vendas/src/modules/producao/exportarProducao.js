import { exportarExcel } from '../../utils/exportarExcel'
import { minutosEntre } from '../../services/producaoService'
import { STATUS_PEDIDO } from '../../utils/constants'

/*
 * SPV-103 — exportação do M.E.S. (apontamentos de produção) para Excel.
 * Aba "Apontamentos": um período de trabalho por linha (quem, qual pedido, quando, quanto).
 * Aba "Resumo por operador": totais de tempo e quantidade de cada operador no período.
 */

const duracao = (a) => (a.fim ? minutosEntre(a.inicio, a.fim) : null)

const COLUNAS_APONTAMENTOS = [
  { titulo: 'Pedido', tipo: 'inteiro', valor: (a) => a.idPedido, largura: 9 },
  { titulo: 'Cliente', valor: (a) => a.pedido?.cliente, largura: 28 },
  { titulo: 'Descrição do pedido', valor: (a) => a.pedido?.descricao, largura: 32 },
  {
    titulo: 'Status do pedido',
    valor: (a) => STATUS_PEDIDO[a.pedido?.status]?.nome,
    largura: 22,
  },
  { titulo: 'Operador', valor: (a) => a.operador, largura: 22 },
  { titulo: 'Início', tipo: 'dataHora', valor: (a) => a.inicio, largura: 17 },
  { titulo: 'Fim', tipo: 'dataHora', valor: (a) => a.fim, largura: 17 },
  { titulo: 'Situação', valor: (a) => (a.fim ? 'Concluído' : 'Em andamento'), largura: 14 },
  { titulo: 'Duração (min)', tipo: 'inteiro', valor: duracao, largura: 13 },
  { titulo: 'Quantidade produzida', tipo: 'inteiro', valor: (a) => a.quantidade, largura: 12 },
  { titulo: 'Observação', valor: (a) => a.observacao, largura: 40 },
]

const COLUNAS_RESUMO = [
  { titulo: 'Operador', valor: (r) => r.operador, largura: 24 },
  { titulo: 'Apontamentos', tipo: 'inteiro', valor: (r) => r.apontamentos, largura: 13 },
  { titulo: 'Concluídos', tipo: 'inteiro', valor: (r) => r.concluidos, largura: 11 },
  { titulo: 'Pedidos diferentes', tipo: 'inteiro', valor: (r) => r.pedidos.size, largura: 12 },
  { titulo: 'Tempo total (min)', tipo: 'inteiro', valor: (r) => r.minutos, largura: 14 },
  { titulo: 'Tempo total (h)', tipo: 'numero', valor: (r) => r.minutos / 60, largura: 13 },
  { titulo: 'Quantidade produzida', tipo: 'inteiro', valor: (r) => r.quantidade, largura: 12 },
  {
    titulo: 'Média (min) por apontamento',
    tipo: 'inteiro',
    valor: (r) => (r.concluidos ? Math.round(r.minutos / r.concluidos) : null),
    largura: 14,
  },
]

// Soma por operador (só apontamentos concluídos contam tempo e quantidade)
export function resumirPorOperador(apontamentos) {
  const porOperador = new Map()
  for (const a of apontamentos) {
    const chave = a.idOperador
    if (!porOperador.has(chave)) {
      porOperador.set(chave, {
        operador: a.operador || `Usuário ${a.idOperador}`,
        apontamentos: 0,
        concluidos: 0,
        pedidos: new Set(),
        minutos: 0,
        quantidade: 0,
      })
    }
    const r = porOperador.get(chave)
    r.apontamentos += 1
    r.pedidos.add(a.idPedido)
    if (a.fim) {
      r.concluidos += 1
      r.minutos += duracao(a)
      r.quantidade += Number(a.quantidade ?? 0)
    }
  }
  return [...porOperador.values()].sort((a, b) => a.operador.localeCompare(b.operador))
}

export async function exportarProducao(apontamentos, de, ate) {
  // mais antigo primeiro: fica na ordem em que a produção aconteceu
  const ordenados = [...apontamentos].sort((a, b) => String(a.inicio).localeCompare(b.inicio))
  await exportarExcel(`producao-${de}-a-${ate}`, [
    { aba: 'Apontamentos', linhas: ordenados, colunas: COLUNAS_APONTAMENTOS },
    { aba: 'Resumo por operador', linhas: resumirPorOperador(ordenados), colunas: COLUNAS_RESUMO },
  ])
}
