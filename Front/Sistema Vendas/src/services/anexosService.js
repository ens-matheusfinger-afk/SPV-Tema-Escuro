import api from './api'

/*
 * SPV-91 — anexos (fotos e arquivos) dos pedidos.
 * O arquivo vai por multipart/form-data e fica salvo no Back (pasta uploads/).
 * Para abrir, o navegador usa o endereço /api/anexos/:id/arquivo (o Vite repassa ao Back).
 */

export const TAMANHO_MAXIMO_MB = 10
export const MAXIMO_POR_ENVIO = 10

// Mesmos tipos aceitos pelo Back (controllers/anexosControllers.js)
export const TIPOS_ACEITOS = {
  'image/jpeg': 'imagem',
  'image/png': 'imagem',
  'image/webp': 'imagem',
  'image/gif': 'imagem',
  'application/pdf': 'pdf',
  'application/msword': 'word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
  'application/vnd.ms-excel': 'excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'text/plain': 'texto',
}
export const ACCEPT = Object.keys(TIPOS_ACEITOS).join(',')

const BASE = import.meta.env.VITE_API_URL || '/api'

function montarAnexo(a) {
  const url = a.urlMock ?? `${BASE}/anexos/${a.id}/arquivo`
  return {
    id: a.id,
    nome: a.nomeOriginal,
    tipo: a.tipo,
    categoria: TIPOS_ACEITOS[a.tipo] ?? 'arquivo',
    tamanho: a.tamanho,
    dataEnvio: a.dataEnvio,
    enviadoPor: a.usuario?.nome ?? '',
    url,
    urlDownload: a.urlMock ?? `${url}?download=1`,
  }
}

export async function listarAnexos(idPedido) {
  const { data } = await api.get(`/pedidos/${idPedido}/anexos`)
  return data.map(montarAnexo)
}

// Confere os arquivos antes de enviar (o Back confere de novo). Devolve a mensagem de erro ou ''.
export function validarArquivos(arquivos) {
  if (arquivos.length === 0) return 'Escolha pelo menos um arquivo.'
  if (arquivos.length > MAXIMO_POR_ENVIO)
    return `Envie no máximo ${MAXIMO_POR_ENVIO} arquivos por vez.`
  const invalido = arquivos.find((f) => !TIPOS_ACEITOS[f.type])
  if (invalido)
    return `Tipo de arquivo não aceito: ${invalido.name}. Envie foto, PDF, Word, Excel ou texto.`
  const grande = arquivos.find((f) => f.size > TAMANHO_MAXIMO_MB * 1024 * 1024)
  if (grande) return `"${grande.name}" passa de ${TAMANHO_MAXIMO_MB} MB.`
  return ''
}

export async function enviarAnexos(idPedido, idUsuario, arquivos) {
  const corpo = new FormData()
  corpo.append('idUsuario', String(idUsuario))
  arquivos.forEach((f) => corpo.append('arquivos', f))
  // timeout maior: arquivos grandes demoram mais que uma requisição comum
  await api.post(`/pedidos/${idPedido}/anexos`, corpo, { timeout: 120000 })
}

export async function removerAnexo(id) {
  await api.delete(`/anexos/${id}`)
}
