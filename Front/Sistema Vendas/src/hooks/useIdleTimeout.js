import { useEffect, useRef } from 'react'

const EVENTOS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']

// Chama aoExpirar() quando o usuário fica "minutos" sem mexer no sistema.
export function useIdleTimeout({ ativo, minutos, aoExpirar }) {
  const callback = useRef(aoExpirar)

  useEffect(() => {
    callback.current = aoExpirar
  }, [aoExpirar])

  useEffect(() => {
    if (!ativo) return undefined

    let timer
    const reiniciar = () => {
      clearTimeout(timer)
      timer = setTimeout(() => callback.current(), minutos * 60 * 1000)
    }

    reiniciar()
    EVENTOS.forEach((evento) => window.addEventListener(evento, reiniciar, { passive: true }))

    return () => {
      clearTimeout(timer)
      EVENTOS.forEach((evento) => window.removeEventListener(evento, reiniciar))
    }
  }, [ativo, minutos])
}
