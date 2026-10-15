import { createContext } from 'react'

// O valor é fornecido pelo AuthProvider. Para usar nas telas: const { usuario } = useAuth()
export const AuthContext = createContext(null)
