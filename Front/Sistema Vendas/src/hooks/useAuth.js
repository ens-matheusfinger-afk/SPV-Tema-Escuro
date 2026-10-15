import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) {
    throw new Error('useAuth precisa estar dentro do <AuthProvider>.')
  }
  return contexto
}
