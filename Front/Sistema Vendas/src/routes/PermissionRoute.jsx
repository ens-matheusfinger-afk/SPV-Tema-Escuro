import { useAuth } from '../hooks/useAuth'
import SemPermissaoPage from '../modules/sistema/SemPermissaoPage'

// REQ002 — bloqueia a tela se o usuário não tiver permissão para ela
export default function PermissionRoute({ tela, children }) {
  const { podeAcessar } = useAuth()
  return podeAcessar(tela) ? children : <SemPermissaoPage />
}
