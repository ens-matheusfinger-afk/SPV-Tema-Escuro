import { criarDadosIniciais } from './dadosIniciais'

// "Banco de dados" do modo de teste. Fica salvo no navegador (localStorage),
// então os pedidos e usuários criados continuam lá depois de recarregar a página.
const CHAVE = 'spv:banco-mock:v1'

let banco = null

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(banco))
  } catch {
    // navegador sem espaço ou em modo privado: segue só em memória
  }
}

export function obterBanco() {
  if (banco) return banco
  try {
    const salvo = localStorage.getItem(CHAVE)
    banco = salvo ? JSON.parse(salvo) : null
  } catch {
    banco = null
  }
  if (!banco) {
    banco = criarDadosIniciais()
    salvar()
  }
  return banco
}

export function persistir() {
  salvar()
}

export function proximoId(tabela) {
  const linhas = obterBanco()[tabela]
  return linhas.reduce((maior, l) => Math.max(maior, l.id), 0) + 1
}

// Volta tudo para os dados de exemplo
export function resetarBancoMock() {
  banco = criarDadosIniciais()
  salvar()
}
