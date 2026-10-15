import { PERFIS } from '../utils/constants'

// Usuários iniciais do modo de teste (sem Back). Senha de todos: 123
// No banco real a senha fica com hash; aqui no mock fica em texto só para facilitar os testes.
const USUARIOS = [
  { id: 1, login: 'admin', nome: 'Administrador', perfil: 'ADMIN', status: 1 },
  { id: 2, login: 'atendente', nome: 'Ana Atendente', perfil: 'ATENDENTE', status: 1 },
  { id: 3, login: 'operador', nome: 'Otávio Operador', perfil: 'OPERADOR', status: 1 },
  { id: 4, login: 'conferente', nome: 'Carla Conferente', perfil: 'CONFERENTE', status: 1 },
  { id: 5, login: 'financeiro', nome: 'Fábio Financeiro', perfil: 'FINANCEIRO', status: 1 },
  { id: 6, login: 'gerente', nome: 'Gustavo Gerente', perfil: 'GERENTE', status: 1 },
  { id: 7, login: 'joao.antigo', nome: 'João (desligado)', perfil: 'ATENDENTE', status: 0 },
]

export const SENHA_PADRAO_MOCK = '123'

export function usuariosIniciais() {
  return USUARIOS.map(({ perfil, ...u }) => ({ ...u, senha: SENHA_PADRAO_MOCK, perfil }))
}

// Monta a tabela usuarioTela (uma linha por usuário x tela liberada), igual ao banco
export function usuarioTelaInicial() {
  let id = 1
  return USUARIOS.flatMap((u) =>
    PERFIS[u.perfil].telas.map((tela) => ({ id: id++, idUsuario: u.id, tela, podeAcessar: true })),
  )
}
