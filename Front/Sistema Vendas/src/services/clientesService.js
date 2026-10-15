import api from './api'

export function normalizarCliente(c) {
  const cpf = c.ClienteCPF?.cpf
  const cnpj = c.ClienteCNPJ?.cnpj
  return {
    id: c.id,
    nome: c.nome,
    email: c.email,
    telefone: c.telefone,
    ativo: Boolean(c.status),
    tipo: cpf ? 'PF' : cnpj ? 'PJ' : null,
    documento: cpf || cnpj || '',
    nomeFantasia: c.ClienteCNPJ?.nomeFantasia || '',
  }
}

export async function listarClientes() {
  const { data } = await api.get('/clientes')
  return data.map(normalizarCliente).sort((a, b) => a.nome.localeCompare(b.nome))
}
