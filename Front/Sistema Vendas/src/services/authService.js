import api from './api'
import { normalizarUsuario } from './usuariosService'

// REQ003 — POST /login devolve o usuário com as telas liberadas
export async function entrar(login, senha) {
  const { data } = await api.post('/login', { login: login.trim().toLowerCase(), senha })
  return normalizarUsuario(data)
}
