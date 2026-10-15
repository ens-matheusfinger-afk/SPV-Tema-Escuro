import { useCallback, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import { useIdleTimeout } from '../hooks/useIdleTimeout'
import { MINUTOS_INATIVIDADE } from '../utils/constants'
import { nomeDoPerfil } from '../utils/permissoes'
import { entrar } from '../services/authService'
import { buscarUsuario } from '../services/usuariosService'
import { mensagemDeErro } from '../services/api'

const CHAVE_SESSAO = 'spv:sessao'

function lerSessao() {
  try {
    const salvo = sessionStorage.getItem(CHAVE_SESSAO)
    return salvo ? JSON.parse(salvo) : null
  } catch {
    return null
  }
}

// Acrescenta o nome do perfil (só para exibir) e guarda na sessão do navegador
function montarSessao(usuario) {
  const sessao = { ...usuario, perfilNome: nomeDoPerfil(usuario.telas) }
  sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao))
  return sessao
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(lerSessao)
  // Mensagem mostrada na tela de login (ex.: sessão encerrada por inatividade)
  const [aviso, setAviso] = useState('')
  // true quando a pessoa clicou em "Sair": aí o login não volta para a tela anterior
  const [saidaManual, setSaidaManual] = useState(false)

  // REQ003
  const login = useCallback(async (loginDigitado, senha) => {
    try {
      const encontrado = await entrar(loginDigitado, senha)
      setUsuario(montarSessao(encontrado))
      setAviso('')
      setSaidaManual(false)
      return { ok: true }
    } catch (erro) {
      return { ok: false, erro: mensagemDeErro(erro, 'Não foi possível entrar. Tente novamente.') }
    }
  }, [])

  // manual = true quando o usuário clicou em "Sair" (false = sessão expirou)
  const logout = useCallback((mensagem = '', manual = false) => {
    sessionStorage.removeItem(CHAVE_SESSAO)
    setUsuario(null)
    setAviso(mensagem)
    setSaidaManual(manual)
  }, [])

  // Busca de novo os dados do usuário logado (depois de editar nome ou permissões dele mesmo)
  const recarregarUsuario = useCallback(async () => {
    if (!usuario) return
    const atualizado = await buscarUsuario(usuario.id)
    setUsuario(montarSessao(atualizado))
  }, [usuario])

  // REQ002 — telas sem chave (ex.: "Meu usuário") ficam liberadas para todos os logados
  const podeAcessar = useCallback(
    (tela) => (tela == null ? Boolean(usuario) : Boolean(usuario?.telas.includes(tela))),
    [usuario],
  )

  // REQ030 — encerra a sessão por inatividade
  useIdleTimeout({
    ativo: Boolean(usuario),
    minutos: MINUTOS_INATIVIDADE,
    aoExpirar: () => logout('Sua sessão foi encerrada por inatividade. Entre novamente.'),
  })

  const valor = useMemo(
    () => ({ usuario, aviso, saidaManual, login, logout, podeAcessar, recarregarUsuario }),
    [usuario, aviso, saidaManual, login, logout, podeAcessar, recarregarUsuario],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
