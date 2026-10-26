import { useState } from 'react'
import { Alert, Button, ButtonGroup, Form, Modal, Spinner } from 'react-bootstrap'
import { mensagemDeErro } from '../../services/api'
import { listarApontamentosPorPeriodo } from '../../services/producaoService'
import { hojeISO } from '../../utils/formatters'
import { somarDias } from '../../utils/validacoes'
import { exportarProducao } from './exportarProducao'

// Atalhos de período mais usados
function periodos(hoje) {
  const [ano, mes] = hoje.split('-').map(Number)
  const dois = (n) => String(n).padStart(2, '0')
  const inicioMes = `${ano}-${dois(mes)}-01`
  const fimMesPassado = somarDias(inicioMes, -1)
  return [
    { rotulo: 'Hoje', de: hoje, ate: hoje },
    { rotulo: 'Últimos 7 dias', de: somarDias(hoje, -6), ate: hoje },
    { rotulo: 'Este mês', de: inicioMes, ate: hoje },
    { rotulo: 'Mês passado', de: `${fimMesPassado.slice(0, 7)}-01`, ate: fimMesPassado },
  ]
}

/*
 * SPV-103 — escolhe o período e baixa a planilha do M.E.S.
 * O período vale pela data de início do apontamento.
 */
export default function ExportarProducaoModal({ aoFechar, aoExportar }) {
  const hoje = hojeISO()
  const atalhos = periodos(hoje)
  const [de, setDe] = useState(atalhos[2].de)
  const [ate, setAte] = useState(hoje)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const erroPeriodo =
    !de || !ate ? 'Informe as duas datas.' : de > ate ? 'A data inicial é depois da final.' : ''

  const gerar = async (e) => {
    e.preventDefault()
    if (erroPeriodo) return
    setGerando(true)
    setErro('')
    setAviso('')
    try {
      const apontamentos = await listarApontamentosPorPeriodo(de, ate)
      if (apontamentos.length === 0) {
        setAviso('Nenhum apontamento de produção nesse período.')
        setGerando(false)
        return
      }
      await exportarProducao(apontamentos, de, ate)
      aoExportar(apontamentos.length)
    } catch (err) {
      setErro(mensagemDeErro(err))
      setGerando(false)
    }
  }

  return (
    <Modal show onHide={gerando ? undefined : aoFechar} centered>
      <Form onSubmit={gerar} noValidate>
        <Modal.Header closeButton={!gerando}>
          <Modal.Title className="h5">Exportar produção (Excel)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-secondary">
            Gera uma planilha com todos os apontamentos do período (operador, pedido, início, fim,
            duração e quantidade) e uma aba com o resumo por operador.
          </p>

          <ButtonGroup size="sm" className="flex-wrap mb-3" aria-label="Períodos rápidos">
            {atalhos.map((a) => (
              <Button
                key={a.rotulo}
                variant={a.de === de && a.ate === ate ? 'primary' : 'outline-primary'}
                onClick={() => {
                  setDe(a.de)
                  setAte(a.ate)
                  setAviso('')
                }}
              >
                {a.rotulo}
              </Button>
            ))}
          </ButtonGroup>

          <div className="row g-3">
            <Form.Group className="col-6" controlId="exportar-de">
              <Form.Label>De</Form.Label>
              <Form.Control
                type="date"
                value={de}
                max={hoje}
                onChange={(e) => setDe(e.target.value)}
                isInvalid={!!erroPeriodo}
              />
            </Form.Group>
            <Form.Group className="col-6" controlId="exportar-ate">
              <Form.Label>Até</Form.Label>
              <Form.Control
                type="date"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
                isInvalid={!!erroPeriodo}
              />
            </Form.Group>
          </div>
          {erroPeriodo && <div className="small text-danger mt-1">{erroPeriodo}</div>}

          {aviso && (
            <Alert variant="info" className="mt-3 mb-0 py-2">
              {aviso}
            </Alert>
          )}
          {erro && (
            <Alert variant="danger" className="mt-3 mb-0 py-2">
              {erro}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" className="border" onClick={aoFechar} disabled={gerando}>
            Cancelar
          </Button>
          <Button type="submit" variant="success" disabled={gerando || !!erroPeriodo}>
            {gerando ? (
              <Spinner size="sm" className="me-1" />
            ) : (
              <i className="bi bi-file-earmark-excel me-1" aria-hidden="true"></i>
            )}
            Baixar planilha
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
