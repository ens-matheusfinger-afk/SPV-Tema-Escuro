import { useContext } from 'react'
import { NotificacaoContext } from '../context/NotificacaoContext'

export function useNotificacao() {
  const notificar = useContext(NotificacaoContext)
  if (!notificar) throw new Error('useNotificacao precisa estar dentro do <NotificacaoProvider>.')
  return notificar
}
