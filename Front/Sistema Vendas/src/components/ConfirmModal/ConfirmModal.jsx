import { useState } from 'react'
import { Alert, Button, Modal, Spinner } from 'react-bootstrap'
import { mensagemDeErro } from '../../services/api'

/*
 * Confirmação de ações críticas (REQ038 — Poka-Yoke).
 * "aoConfirmar" pode ser assíncrona: o botão mostra carregando e, se der erro,
 * a mensagem aparece dentro do próprio modal.
 */
export default function ConfirmModal({
  aberto,
  titulo,
  children,
  textoConfirmar = 'Confirmar',
  variante = 'danger',
  aoConfirmar,
  aoFechar,
}) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const fechar = () => {
    if (enviando) return
    setErro('')
    aoFechar()
  }

  const confirmar = async () => {
    setEnviando(true)
    setErro('')
    try {
      await aoConfirmar()
      setEnviando(false)
      aoFechar()
    } catch (e) {
      setEnviando(false)
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <Modal show={aberto} onHide={fechar} centered>
      <Modal.Header closeButton>
        <Modal.Title className="h5">{titulo}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {children}
        {erro && (
          <Alert variant="danger" className="small mt-3 mb-0">
            {erro}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" className="border" onClick={fechar} disabled={enviando}>
          Voltar
        </Button>
        <Button variant={variante} onClick={confirmar} disabled={enviando}>
          {enviando ? <Spinner size="sm" /> : textoConfirmar}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
