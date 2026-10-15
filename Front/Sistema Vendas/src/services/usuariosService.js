import api from './api'
import { TELAS } from '../utils/constants'

const TODAS_AS_TELAS = Object.values(TELAS)

// Formato que o Back devolve -> formato usado nas telas
export function normalizarUsuario(u) {
  return {
    id: u.id,
    login: u.login,
    nome: u.nome,
    ativo: Number(u.status) === 1,
    telas: (u.UsuarioTelas || []).filter((t) => t.podeAcessar).map((t) => t.tela),
  }
}

export async function listarUsuarios() {
  const { data } = await api.get('/usuarios')
  return data.map(normalizarUsuario).sort((a, b) => a.nome.localeCompare(b.nome))
}

export async function buscarUsuario(id) {
  const { data } = await api.get(`/usuarios/${id}`)
  if (!data) throw new Error('Usuário não encontrado.')
  return normalizarUsuario(data)
}

// Grava as permissões do usuário na tabela usuarioTela (uma linha por tela)
export async function salvarPermissoes(idUsuario, telasLiberadas) {
  const { data: existentes } = await api.get(`/usuario-tela/usuario/${idUsuario}`)

  for (const tela of TODAS_AS_TELAS) {
    const podeAcessar = telasLiberadas.includes(tela)
    const registro = existentes.find((r) => r.tela === tela)

    if (registro && Boolean(registro.podeAcessar) !== podeAcessar) {
      await api.put(`/usuario-tela/${registro.id}`, { idUsuario, tela, podeAcessar })
    } else if (!registro && podeAcessar) {
      await api.post('/usuario-tela', { idUsuario, tela, podeAcessar })
    }
  }
}

export async function criarUsuario({ nome, login, senha, ativo, telas }) {
  const { data } = await api.post('/usuarios', {
    nome: nome.trim(),
    login: login.trim().toLowerCase(),
    senha,
    status: ativo ? 1 : 0,
  })
  await salvarPermissoes(data.id, telas)
  return data.id
}

export async function atualizarUsuario(id, { nome, login, ativo, senha, telas }) {
  const corpo = { nome: nome.trim(), login: login.trim().toLowerCase(), status: ativo ? 1 : 0 }
  if (senha) corpo.senha = senha
  await api.put(`/usuarios/${id}`, corpo)
  if (telas) await salvarPermissoes(id, telas)
}

export async function alterarStatusUsuario(usuario, ativo) {
  await api.put(`/usuarios/${usuario.id}`, {
    nome: usuario.nome,
    login: usuario.login,
    status: ativo ? 1 : 0,
  })
}

// Alteração de senha pelo próprio usuário (confere a senha atual no Back)
export async function alterarMinhaSenha(id, senhaAtual, novaSenha) {
  await api.put(`/usuarios/${id}/senha`, { senhaAtual, novaSenha })
}
