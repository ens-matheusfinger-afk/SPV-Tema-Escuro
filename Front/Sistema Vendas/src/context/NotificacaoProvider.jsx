import { useCallback, useState } from 'react'
import { Toast, ToastContainer } from 'react-bootstrap'
import { NotificacaoContext } from './NotificacaoContext'

const ICONES = {
  success: 'bi-check-circle-fill text-success',
  danger: 'bi-x-circle-fill text-danger',
  warning: 'bi-exclamation-triangle-fill text-warning',
  info: 'bi-info-circle-fill text-primary',
}

let contador = 0

export function NotificacaoProvider({ children }) {
  const [avisos, setAvisos] = useState([])

  const remover = useCallback((id) => setAvisos((atual) => atual.filter((a) => a.id !== id)), [])

  // tipo: success | danger | warning | info
  const notificar = useCallback((mensagem, tipo = 'success') => {
    contador += 1
    setAvisos((atual) => [...atual, { id: contador, mensagem, tipo }])
  }, [])

  return (
    <NotificacaoContext.Provider value={notificar}>
      {children}
      <ToastContainer position="top-end" className="p-3 position-fixed" style={{ zIndex: 1090 }}>
        {avisos.map((a) => (
          <Toast key={a.id} onClose={() => remover(a.id)} delay={4000} autohide>
            <Toast.Body className="d-flex align-items-start gap-2">
              <i className={`bi ${ICONES[a.tipo] ?? ICONES.info}`} aria-hidden="true"></i>
              <span className="me-auto">{a.mensagem}</span>
              <button
                type="button"
                className="btn-close btn-close-sm"
                aria-label="Fechar aviso"
                onClick={() => remover(a.id)}
              ></button>
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </NotificacaoContext.Provider>
  )
}
