const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const data = new Intl.DateTimeFormat('pt-BR')
const dataUTC = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function formatarMoeda(valor) {
  return moeda.format(Number(valor) || 0)
}

// Para datas com hora (ex.: dataCriacao)
export function formatarData(valor) {
  return valor ? data.format(new Date(valor)) : '—'
}

export function formatarDataHora(valor) {
  return valor ? dataHora.format(new Date(valor)) : '—'
}

/*
 * Para datas "só dia" (ex.: dataEntregaPrevista).
 * O Back grava esse dia como meia-noite no fuso do servidor e devolve em UTC
 * ("2026-10-12T03:00:00.000Z"). Ler em UTC evita mostrar o dia anterior.
 */
export function formatarDia(valor) {
  return valor ? dataUTC.format(new Date(valor)) : '—'
}

// "2026-10-12T03:00:00.000Z" -> "2026-10-12" (valor para <input type="date">)
export function diaParaInput(valor) {
  return valor ? new Date(valor).toISOString().slice(0, 10) : ''
}

// Hoje no formato "AAAA-MM-DD", no fuso do usuário
export function hojeISO() {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export function estaAtrasado(dataPrevista) {
  return Boolean(dataPrevista) && diaParaInput(dataPrevista) < hojeISO()
}

// "Matheus Dalanhol Finger" -> "MD"
export function iniciais(nome = '') {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('')
}

export function formatarDocumento(doc = '') {
  const n = String(doc).replace(/\D/g, '')
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return doc || ''
}

export function formatarTelefone(tel = '') {
  const n = String(tel).replace(/\D/g, '')
  if (n.length === 11) return n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (n.length === 10) return n.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return tel || ''
}

// Busca sem diferenciar maiúsculas e acentos: "joao" encontra "João"
export function normalizarBusca(texto = '') {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Duração em minutos -> "45 min", "1h", "1h 30min"
export function formatarDuracao(minutos) {
  if (minutos === null || minutos === undefined || minutos === '') return '—'
  const total = Number(minutos)
  if (!Number.isFinite(total) || total < 0) return '—'
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

// Tamanho de arquivo em bytes -> "850 KB", "2,4 MB"
export function formatarTamanho(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
}

// Máscaras aplicadas enquanto o usuário digita (aceitam número incompleto)
function aplicarMascara(digitos, mascara) {
  let i = 0
  let saida = ''
  for (const c of mascara) {
    if (i >= digitos.length) break
    saida += c === '#' ? digitos[i++] : c
  }
  return saida
}

export function mascaraDocumento(tipo, texto) {
  const n = String(texto ?? '').replace(/\D/g, '')
  return tipo === 'PJ'
    ? aplicarMascara(n.slice(0, 14), '##.###.###/####-##')
    : aplicarMascara(n.slice(0, 11), '###.###.###-##')
}

export function mascaraTelefone(texto) {
  const n = String(texto ?? '')
    .replace(/\D/g, '')
    .slice(0, 11)
  return aplicarMascara(n, n.length > 10 ? '(##) #####-####' : '(##) ####-####')
}
