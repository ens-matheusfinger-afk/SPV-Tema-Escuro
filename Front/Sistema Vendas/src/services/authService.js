import api from './api'
import { normalizarUsuario } from './usuariosService'

// REQ003 — POST /login devolve o usuário com as telas liberadas
export async function entrar(login, senha) {
  const { data } = await api.post('/login', { login: login.trim().toLowerCase(), senha })
  return normalizarUsuario(data)
}

// SPV-111 — registra a saída no log (não espera e não mostra erro: a saída acontece de qualquer jeito)
export function registrarSaida(idUsuario, motivo) {
  api
    .post('/login/sair', { motivo, idUsuario }, { headers: { 'X-Usuario-Id': String(idUsuario) } })
    .catch(() => {})
}
