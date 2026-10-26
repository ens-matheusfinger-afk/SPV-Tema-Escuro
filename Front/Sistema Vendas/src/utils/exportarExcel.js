/*
 * Exportação para Excel (.xlsx) reaproveitável — SPV-102/103/104/105.
 * Cada tela só descreve as colunas; este arquivo monta a planilha e baixa o arquivo.
 *
 * Uso:
 *   await exportarExcel('pedidos-2026-10-21', [
 *     { aba: 'Pedidos', linhas: pedidos, colunas: [
 *       { titulo: 'Nº', tipo: 'inteiro', valor: (p) => p.id, largura: 8 },
 *       { titulo: 'Total', tipo: 'moeda', valor: (p) => p.total },
 *     ] },
 *   ])
 *
 * Tipos: texto (padrão) | inteiro | numero | moeda | data (só o dia) | dataHora
 * A biblioteca só é carregada quando alguém clica em exportar (não pesa na abertura do sistema).
 */

const FORMATOS = {
  inteiro: '0',
  numero: '#,##0.00',
  moeda: '"R$" #,##0.00',
  data: 'dd/mm/yyyy',
  dataHora: 'dd/mm/yyyy hh:mm',
}

const CABECALHO = {
  fontWeight: 'bold',
  backgroundColor: '#E8F4FF',
  borderColor: '#9FC9EE',
  borderStyle: 'thin',
}

// "2026-10-23T03:00:00.000Z" (dia gravado pelo Back) -> data só com o dia, sem erro de fuso
function paraDia(valor) {
  const d = new Date(valor)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

// Data com hora: o Excel não tem fuso, então grava a hora local como ela aparece na tela
function paraDataHora(valor) {
  const d = new Date(valor)
  return new Date(
    Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds(),
    ),
  )
}

function celula(tipo, bruto) {
  if (bruto === null || bruto === undefined || bruto === '') return null
  switch (tipo) {
    case 'inteiro':
    case 'numero':
    case 'moeda': {
      const n = Number(bruto)
      return Number.isFinite(n) ? { value: n, type: Number, format: FORMATOS[tipo] } : null
    }
    case 'data':
      return { value: paraDia(bruto), type: Date, format: FORMATOS.data }
    case 'dataHora':
      return { value: paraDataHora(bruto), type: Date, format: FORMATOS.dataHora }
    default:
      return { value: String(bruto), type: String }
  }
}

export async function exportarExcel(nomeArquivo, abas) {
  const { default: writeExcelFile } = await import('write-excel-file/browser')

  const planilhas = abas.map(({ aba, linhas, colunas }) => ({
    sheet: aba.slice(0, 31), // limite do Excel para nome de aba
    stickyRowsCount: 1, // cabeçalho fica fixo ao rolar
    columns: colunas.map((c) => ({ width: c.largura ?? 16 })),
    data: [
      colunas.map((c) => ({ value: c.titulo, ...CABECALHO })),
      ...linhas.map((linha, i) => colunas.map((c) => celula(c.tipo, c.valor(linha, i)))),
    ],
  }))

  await writeExcelFile(planilhas).toFile(`${nomeArquivo}.xlsx`)
}

// "pedidos" -> "pedidos-2026-10-21"
export function nomeComData(base) {
  const d = new Date()
  const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${base}-${dia}`
}
