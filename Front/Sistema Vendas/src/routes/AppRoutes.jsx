import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROTAS } from './rotas'
import ProtectedRoute from './ProtectedRoute'
import PermissionRoute from './PermissionRoute'
import AppLayout from '../layouts/AppLayout/AppLayout'
import LoginPage from '../modules/auth/LoginPage'
import SemPermissaoPage from '../modules/sistema/SemPermissaoPage'
import NaoEncontradaPage from '../modules/sistema/NaoEncontradaPage'

// "/" leva para a primeira tela que o usuário pode acessar
function Inicio() {
  const { podeAcessar } = useAuth()
  const primeira = ROTAS.find((rota) => podeAcessar(rota.tela))
  return primeira ? <Navigate to={primeira.path} replace /> : <SemPermissaoPage />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Inicio />} />
          {ROTAS.map(({ path, tela, componente: Pagina }) => (
            <Route
              key={path}
              path={path}
              element={
                <PermissionRoute tela={tela}>
                  <Pagina />
                </PermissionRoute>
              }
            />
          ))}
          <Route path="*" element={<NaoEncontradaPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
