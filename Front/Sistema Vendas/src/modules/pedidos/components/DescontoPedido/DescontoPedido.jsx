import { useState } from 'react'
import {
  Alert,
  Button,
  ButtonGroup,
  Form,
  InputGroup,
  Modal,
  Spinner,
  ToggleButton,
} from 'react-bootstrap'
import { mensagemDeErro } from '../../../../services/api'
import { formatarMoeda } from '../../../../utils/formatters'
import { lerNumero } from '../../../../utils/validacoes'

// Mesmo cálculo do Back (utils/descontos.js) e da trigger trg_pedidos_desconto
function calcularDesconto(subtotal, tipo, informado) {
  const sub = Math.round(subtotal * 100)
  let desconto = 0
  if (tipo === 'percentual') desconto = Math.round((sub * informado) / 100)
  else if (tipo === 'valor') desconto = Math.min(Math.round(informado * 100), sub)
  return { valor: desconto / 100, total: (sub - desconto) / 100 }
}

const MOTIVOS_RAPIDOS = ['Cliente fiel', 'Pagamento à vista', 'Pedido grande', 'Arredondamento']

/*
 * SPV-73 — desconto no pedido: resumo (subtotal, desconto, total) embaixo dos itens e
 * janela para aplicar/trocar/tirar o desconto. Pode dar desconto enquanto o pedido não foi
 * finalizado nem cancelado; fica registrado quem deu e o motivo.
 */
export default function DescontoPedido({ pedido, podeAlterar, aoSalvar }) {
  const [aberto, setAberto] = useState(false)
  const d = pedido.desconto

  return (
    <div className="spv-desconto border-top px-3 py-2" data-testid="resumo-desconto">
      {d && (
        <>
          <div className="d-flex justify-content-between small text-success">
            <span>
              <i className="bi bi-tag me-1" aria-hidden="true"></i>
              Desconto
              {d.tipo === 'percentual' ? ` de ${String(d.informado).replace('.', ',')}%` : ''}
              <span className="text-secondary">
                {' '}
                · {d.motivo}
                {d.por ? ` (por ${d.por})` : ''}
              </span>
            </span>
            <span className="text-nowrap">− {formatarMoeda(d.valor)}</span>
          </div>
        </>
      )}
      <div className="d-flex justify-content-between align-items-center gap-2 mt-1">
        <span className="fw-bold">Total do pedido</span>
        <span className="d-flex align-items-center gap-2">
          {podeAlterar && (
            <Button size="sm" variant="outline-success" onClick={() => setAberto(true)}>
              <i className="bi bi-tag me-1" aria-hidden="true"></i>
              {d ? 'Alterar desconto' : 'Dar desconto'}
            </Button>
          )}
          <span className="spv-total fw-bold fs-5 text-nowrap">{formatarMoeda(pedido.total)}</span>
        </span>
      </div>
      {aberto && (
        <DescontoModal
          pedido={pedido}
          aoFechar={() => setAberto(false)}
          aoSalvar={async (dados) => {
            await aoSalvar(dados)
            setAberto(false)
          }}
        />
      )}
    </div>
  )
}

function DescontoModal({ pedido, aoFechar, aoSalvar }) {
  const atual = pedido.desconto
  const [tipo, setTipo] = useState(atual?.tipo ?? 'percentual')
  const [valor, setValor] = useState(atual ? String(atual.informado) : '')
  const [motivo, setMotivo] = useState(atual?.motivo ?? '')
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const n = lerNumero(valor)
  const centavosOk = Number.isFinite(n) && Math.abs(Math.round(n * 100) - n * 100) < 1e-6
  const erros = {
    valor:
      !centavosOk ||
      n <= 0 ||
      (tipo === 'percentual' && n > 100) ||
      (tipo === 'valor' && Math.round(n * 100) > Math.round(pedido.subtotal * 100)),
    motivo: motivo.trim().length < 3,
  }
  const valido = !erros.valor && !erros.motivo
  const previa = !erros.valor ? calcularDesconto(pedido.subtotal, tipo, n) : null

  const salvar = async (dados) => {
    setSalvando(true)
    setErro('')
    try {
      await aoSalvar(dados)
    } catch (e) {
      setErro(mensagemDeErro(e))
      setSalvando(false)
    }
  }

  const confirmar = (e) => {
    e.preventDefault()
    setTentou(true)
    if (valido) salvar({ tipo, valor: n, motivo: motivo.trim() })
  }

  return (
    <Modal show onHide={salvando ? undefined : aoFechar} backdrop="static" centered>
      <Form onSubmit={confirmar} noValidate>
        <Modal.Header closeButton={!salvando}>
          <Modal.Title className="h5">Desconto no pedido nº {pedido.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="spv-baixa-resumo mb-3 d-flex justify-content-between">
            <span>Subtotal dos itens</span>
            <strong>{formatarMoeda(pedido.subtotal)}</strong>
          </div>

          <div className="row g-3">
            <div className="col-sm-5">
              <div className="form-label">Tipo</div>
              <ButtonGroup className="w-100" aria-label="Tipo de desconto">
                {[
                  ['percentual', '%'],
                  ['valor', 'R$'],
                ].map(([chave, rotulo]) => (
                  <ToggleButton
                    key={chave}
                    id={`desconto-tipo-${chave}`}
                    type="radio"
                    name="desconto-tipo"
                    value={chave}
                    variant={tipo === chave ? 'primary' : 'outline-primary'}
                    checked={tipo === chave}
                    onChange={() => setTipo(chave)}
                  >
                    {rotulo}
                  </ToggleButton>
                ))}
              </ButtonGroup>
            </div>
            <Form.Group className="col-sm-7" controlId="desconto-valor">
              <Form.Label>{tipo === 'percentual' ? 'Percentual' : 'Valor do desconto'}</Form.Label>
              <InputGroup hasValidation>
                {tipo === 'valor' && <InputGroup.Text>R$</InputGroup.Text>}
                <Form.Control
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  autoFocus
                  value={valor}
                  isInvalid={tentou && erros.valor}
                  onChange={(e) => setValor(e.target.value)}
                />
                {tipo === 'percentual' && <InputGroup.Text>%</InputGroup.Text>}
                <Form.Control.Feedback type="invalid">
                  {tipo === 'percentual'
                    ? 'De 0,01% a 100%.'
                    : `De R$ 0,01 até ${formatarMoeda(pedido.subtotal)}.`}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
            <Form.Group className="col-12" controlId="desconto-motivo">
              <Form.Label>Motivo</Form.Label>
              <Form.Control
                maxLength={255}
                placeholder="Ex.: cliente fiel, pagamento à vista"
                value={motivo}
                isInvalid={tentou && erros.motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
              <Form.Control.Feedback type="invalid">
                Informe o motivo do desconto.
              </Form.Control.Feedback>
              <div className="d-flex flex-wrap gap-1 mt-2">
                {MOTIVOS_RAPIDOS.map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant="light"
                    className="border"
                    onClick={() => setMotivo(m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </Form.Group>
          </div>

          {previa && (
            <div className="spv-baixa-resumo mt-3 small" data-testid="previa-desconto">
              <div className="d-flex justify-content-between text-success">
                <span>Desconto</span>
                <span>− {formatarMoeda(previa.valor)}</span>
              </div>
              <div className="d-flex justify-content-between fw-bold fs-6">
                <span>Novo total</span>
                <span>{formatarMoeda(previa.total)}</span>
              </div>
            </div>
          )}
          <div className="small text-secondary mt-2">
            <i className="bi bi-info-circle me-1" aria-hidden="true"></i>A conta a receber do pedido
            é atualizada sozinha com o novo total.
          </div>
          {erro && (
            <Alert variant="danger" className="small mt-3 mb-0">
              {erro}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          {atual && (
            <Button
              variant="outline-danger"
              className="me-auto"
              disabled={salvando}
              onClick={() => salvar({ tipo: null })}
            >
              Tirar desconto
            </Button>
          )}
          <Button variant="light" className="border" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" variant="success" disabled={salvando}>
            {salvando ? <Spinner size="sm" /> : 'Aplicar desconto'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
