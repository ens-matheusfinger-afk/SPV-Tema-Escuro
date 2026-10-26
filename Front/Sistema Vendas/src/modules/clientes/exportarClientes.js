import { exportarExcel, nomeComData } from '../../utils/exportarExcel'
import { formatarDocumento, formatarTelefone } from '../../utils/formatters'
import { FATOR_CONFIANCA } from '../../services/clientesService'

/*
 * SPV-105 — exportação dos clientes para Excel (a lista que está na tela, com os filtros).
 * Junto com os dados de cadastro vão os números de pedidos de cada cliente.
 */
const COLUNAS = [
  { titulo: 'Nº', tipo: 'inteiro', valor: (c) => c.id, largura: 7 },
  { titulo: 'Nome / Razão social', valor: (c) => c.nome, largura: 30 },
  {
    titulo: 'Tipo',
    valor: (c) => (c.tipo === 'PJ' ? 'Pessoa jurídica' : c.tipo === 'PF' ? 'Pessoa física' : ''),
    largura: 15,
  },
  { titulo: 'CPF/CNPJ', valor: (c) => formatarDocumento(c.documento), largura: 20 },
  { titulo: 'Nome fantasia', valor: (c) => c.nomeFantasia, largura: 22 },
  { titulo: 'Telefone', valor: (c) => formatarTelefone(c.telefone), largura: 16 },
  { titulo: 'E-mail', valor: (c) => c.email, largura: 28 },
  { titulo: 'Situação', valor: (c) => (c.ativo ? 'Ativo' : 'Inativo'), largura: 10 },
  { titulo: 'Confiança (1-5)', tipo: 'inteiro', valor: (c) => c.fatorConfianca, largura: 11 },
  {
    titulo: 'Nível de confiança',
    valor: (c) => FATOR_CONFIANCA[c.fatorConfianca]?.nome,
    largura: 14,
  },
  { titulo: 'Observação', valor: (c) => c.observacao, largura: 45 },
  { titulo: 'Pedidos', tipo: 'inteiro', valor: (c) => c.resumo.pedidos, largura: 9 },
  { titulo: 'Em aberto', tipo: 'inteiro', valor: (c) => c.resumo.abertos, largura: 10 },
  { titulo: 'Valor em aberto', tipo: 'moeda', valor: (c) => c.resumo.valorAberto, largura: 15 },
  { titulo: 'Total comprado', tipo: 'moeda', valor: (c) => c.resumo.comprado, largura: 15 },
  { titulo: 'Último pedido', tipo: 'dataHora', valor: (c) => c.resumo.ultimo, largura: 17 },
]

// clientes: lista já com "resumo" (ver resumirPedidosPorCliente)
export async function exportarClientes(clientes) {
  await exportarExcel(nomeComData('clientes'), [
    { aba: 'Clientes', linhas: clientes, colunas: COLUNAS },
  ])
}
