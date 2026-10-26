import api from './api'
import { somenteDigitos } from '../utils/validacoes'

/*
 * Clientes (tabela pai) + CPF ou CNPJ (tabelas filhas).
 * O Back grava tudo numa chamada só (POST/PUT /clientes com tipo e documento).
 */

export const FATOR_CONFIANCA = {
  1: { nome: 'Muito baixa', cor: 'danger' },
  2: { nome: 'Baixa', cor: 'warning' },
  3: { nome: 'Normal', cor: 'secondary' },
  4: { nome: 'Boa', cor: 'info' },
  5: { nome: 'Alta', cor: 'success' },
}

// Confiança 1 ou 2: o atendente vê um aviso ao abrir pedido para o cliente (SPV-119)
export const CONFIANCA_DE_ATENCAO = 2

export function normalizarCliente(c) {
  const cpf = c.ClienteCPF?.cpf
  const cnpj = c.ClienteCNPJ?.cnpj
  return {
    id: c.id,
    nome: c.nome,
    email: c.email ?? '',
    telefone: c.telefone ?? '',
    ativo: Boolean(c.status),
    tipo: cpf ? 'PF' : cnpj ? 'PJ' : null,
    documento: cpf || cnpj || '',
    nomeFantasia: c.ClienteCNPJ?.nomeFantasia || '',
    observacao: c.observacao ?? '',
    fatorConfianca: Number(c.fatorConfianca ?? 3),
  }
}

export async function listarClientes() {
  const { data } = await api.get('/clientes')
  return data.map(normalizarCliente).sort((a, b) => a.nome.localeCompare(b.nome))
}

// Valores do formulário -> body do Back (sem máscara)
function montarCorpo(valores) {
  return {
    nome: valores.nome.trim(),
    telefone: somenteDigitos(valores.telefone),
    email: valores.email.trim(),
    tipo: valores.tipo,
    documento: somenteDigitos(valores.documento),
    nomeFantasia: valores.tipo === 'PJ' ? valores.nomeFantasia.trim() : '',
    observacao: valores.observacao.trim(),
    fatorConfianca: Number(valores.fatorConfianca),
    status: valores.ativo,
  }
}

export async function criarCliente(valores) {
  const { data } = await api.post('/clientes', montarCorpo(valores))
  return normalizarCliente(data)
}

export async function atualizarCliente(id, valores) {
  const { data } = await api.put(`/clientes/${id}`, montarCorpo(valores))
  return normalizarCliente(data)
}

export async function alterarStatusCliente(id, ativo) {
  await api.put(`/clientes/${id}`, { status: ativo })
}

// Só cliente sem pedidos (o Back responde 409 se tiver)
export async function excluirCliente(id) {
  await api.delete(`/clientes/${id}`)
}

// SPV-118/58 — clientes com conta vencida: Map(idCliente -> { totalVencido, contas: [...] })
// (conta avulsa vencida ou de pedido já entregue; pedido não entregue atrasado não conta)
export async function listarInadimplentes() {
  const { data } = await api.get('/clientes/inadimplentes')
  return new Map(
    data.map((c) => [
      c.idCliente,
      {
        idCliente: c.idCliente,
        nome: c.nome,
        telefone: c.telefone ?? '',
        totalVencido: Number(c.totalVencido),
        contas: c.contas.map((x) => ({ ...x, valor: Number(x.valor) })),
      },
    ]),
  )
}
