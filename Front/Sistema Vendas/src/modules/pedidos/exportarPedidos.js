import { exportarExcel, nomeComData } from '../../utils/exportarExcel'
import { STATUS_PEDIDO } from '../../utils/constants'
import { formatarDocumento } from '../../utils/formatters'
import { situacaoPrazo } from './filtros'

// SPV-104 — colunas da planilha de pedidos (mesma lista que está na tela, com os filtros aplicados)
const COLUNAS = [
  { titulo: 'Nº', tipo: 'inteiro', valor: (p) => p.id, largura: 7 },
  { titulo: 'Cliente', valor: (p) => p.cliente?.nome, largura: 28 },
  { titulo: 'CPF/CNPJ', valor: (p) => formatarDocumento(p.cliente?.documento ?? ''), largura: 20 },
  { titulo: 'Vendedor', valor: (p) => p.vendedor, largura: 18 },
  { titulo: 'Descrição', valor: (p) => p.descricao, largura: 34 },
  { titulo: 'Criado em', tipo: 'dataHora', valor: (p) => p.dataCriacao, largura: 17 },
  { titulo: 'Entrega prevista', tipo: 'data', valor: (p) => p.dataEntregaPrevista, largura: 15 },
  { titulo: 'Entregue em', tipo: 'dataHora', valor: (p) => p.dataEntregaRealizada, largura: 17 },
  { titulo: 'Status', valor: (p) => STATUS_PEDIDO[p.status]?.nome, largura: 22 },
  { titulo: 'Prazo', valor: (p) => situacaoPrazo(p)?.texto ?? '', largura: 18 },
  { titulo: 'Total', tipo: 'moeda', valor: (p) => p.total, largura: 14 },
]

export async function exportarPedidos(pedidos, base = 'pedidos') {
  await exportarExcel(nomeComData(base), [{ aba: 'Pedidos', linhas: pedidos, colunas: COLUNAS }])
}
