import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// REQ003 — sem sessão válida, volta para o login (e depois retorna para onde estava)
export default function ProtectedRoute() {
  const { usuario, saidaManual } = useAuth()
  const location = useLocation()

  if (!usuario) {
    // Depois de clicar em "Sair" não guarda a tela atual (o próximo login começa do início)
    return (
      <Navigate to="/login" replace state={saidaManual ? undefined : { de: location.pathname }} />
    )
  }

  return <Outlet />
}
