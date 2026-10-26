import { DIAS_MAXIMOS_ENTREGA } from './constants'
import { hojeISO, normalizarBusca } from './formatters'

/*
 * Validações reaproveitadas pelos formulários de cadastro (SPV-107 — Poka-Yoke).
 * Os campos chegam como texto (valor do <input>); por isso as funções aceitam string.
 */

// Maior valor que cabe em NUMERIC(10,2) no banco
export const VALOR_MAXIMO = 99999999.99

// "29.9" ou "29,90" -> 29.9 | texto vazio ou inválido -> NaN
export function lerNumero(texto) {
  if (texto === null || texto === undefined || String(texto).trim() === '') return NaN
  return Number(String(texto).replace(',', '.'))
}

export function valorMonetarioValido(texto) {
  const n = lerNumero(texto)
  // até 2 casas decimais (com folga para o arredondamento do JavaScript: 29.9 * 100 = 2990.0000000000005)
  const centavosExatos = Math.abs(Math.round(n * 100) - n * 100) < 1e-6
  return Number.isFinite(n) && n > 0 && n <= VALOR_MAXIMO && centavosExatos
}

export function inteiroNaoNegativo(texto, { obrigatorio = true, maximo = 999999 } = {}) {
  if (String(texto ?? '').trim() === '') return !obrigatorio
  const n = lerNumero(texto)
  return Number.isInteger(n) && n >= 0 && n <= maximo
}

// Já existe outro registro com o mesmo nome (sem diferenciar maiúsculas e acentos)?
export function nomeEmUso(nome, existentes, idAtual) {
  const alvo = normalizarBusca(nome)
  return (
    Boolean(alvo) && existentes.some((e) => e.id !== idAtual && normalizarBusca(e.nome) === alvo)
  )
}

// "AAAA-MM-DD" daqui a N dias (no fuso do usuário)
export function somarDias(iso, dias) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const d = new Date(ano, mes - 1, dia + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Última data de entrega aceita (evita ano digitado errado, ex.: 2062 em vez de 2026)
export function dataMaximaEntrega(hoje = hojeISO()) {
  return somarDias(hoje, DIAS_MAXIMOS_ENTREGA)
}

// Mensagem de erro da data de entrega, ou '' se estiver certa
export function erroDataEntrega(iso, hoje = hojeISO()) {
  if (!iso) return 'Informe a data prevista de entrega.'
  if (iso < hoje) return 'A data não pode ser anterior a hoje.'
  if (iso > dataMaximaEntrega(hoje)) {
    return 'A data está a mais de 1 ano de hoje. Confira o ano digitado.'
  }
  return ''
}

// ---------- Clientes: CPF, CNPJ, telefone e e-mail (mesma regra do Back) ----------

export const somenteDigitos = (valor) => String(valor ?? '').replace(/\D/g, '')

// Dígitos verificadores do CPF (Receita Federal). "111.111.111-11" passa na conta, mas não existe.
export function cpfValido(valor) {
  const cpf = somenteDigitos(valor)
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  const digito = (tamanho) => {
    let soma = 0
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10])
}

export function cnpjValido(valor) {
  const cnpj = somenteDigitos(valor)
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false
  const digito = (tamanho) => {
    const pesos = (tamanho === 12 ? [5, 4, 3, 2] : [6, 5, 4, 3, 2]).concat([9, 8, 7, 6, 5, 4, 3, 2])
    const soma = pesos.reduce((s, peso, i) => s + Number(cnpj[i]) * peso, 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return digito(12) === Number(cnpj[12]) && digito(13) === Number(cnpj[13])
}

// Vazio é aceito (campo opcional); preenchido precisa de DDD + número
export function telefoneValido(valor) {
  const n = somenteDigitos(valor)
  return n === '' || n.length === 10 || n.length === 11
}

export function emailValido(valor) {
  const email = String(valor ?? '').trim()
  return email === '' || (email.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
}
