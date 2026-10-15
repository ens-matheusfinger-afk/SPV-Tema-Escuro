import { createContext } from 'react'

// Avisos rápidos no canto da tela. Uso: const notificar = useNotificacao(); notificar('Salvo!')
export const NotificacaoContext = createContext(null)
