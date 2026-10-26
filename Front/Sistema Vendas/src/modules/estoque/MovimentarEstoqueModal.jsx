import { useState } from 'react'
import { Alert, Button, Form, InputGroup, Modal, Spinner } from 'react-bootstrap'
import { mensagemDeErro } from '../../services/api'
import { inteiroNaoNegativo, lerNumero } from '../../utils/validacoes'

const CONFIG = {
  entrada: {
    titulo: 'Entrada de mercadoria',
    rotuloQuantidade: 'Quantidade que chegou',
    motivoObrigatorio: false,
    placeholderMotivo: 'Ex.: NF 1234, fornecedor X',
    botao: 'Registrar entrada',
    variante: 'success',
  },
  saida: {
    titulo: 'Saída manual',
    rotuloQuantidade: 'Quantidade que saiu',
    motivoObrigatorio: true,
    placeholderMotivo: 'Ex.: quebrou, amostra, uso interno',
    botao: 'Registrar saída',
    variante: 'danger',
  },
  ajuste: {
    titulo: 'Ajuste pelo inventário',
    rotuloQuantidade: 'Saldo contado na prateleira',
    motivoObrigatorio: true,
    placeholderMotivo: 'Ex.: contagem do inventário de outubro',
    botao: 'Ajustar saldo',
    variante: 'warning',
  },
}

/*
 * Entrada, saída manual (SPV-65) e ajuste pelo inventário (SPV-109) de um produto.
 * tipo: 'entrada' | 'saida' | 'ajuste'. No ajuste, digita o saldo contado (não a diferença).
 */
export default function MovimentarEstoqueModal({ produto, tipo, aoConfirmar, aoFechar }) {
  const cfg = CONFIG[tipo]
  const atual = produto.estoque.atual
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const n = lerNumero(quantidade)
  const valido = inteiroNaoNegativo(quantidade) && (tipo === 'ajuste' ? n !== atual : n > 0)
  const passaDoSaldo = tipo === 'saida' && valido && n > atual
  const motivoFalta = cfg.motivoObrigatorio && !motivo.trim()
  const saldoDepois = !valido
    ? null
    : tipo === 'entrada'
      ? atual + n
      : tipo === 'saida'
        ? atual - n
        : n

  const erroQuantidade = !valido
    ? tipo === 'ajuste' && n === atual
      ? 'O saldo contado é igual ao atual: não há o que ajustar.'
      : tipo === 'ajuste'
        ? 'Informe o saldo contado (número inteiro, 0 ou mais).'
        : 'Informe uma quantidade inteira maior que zero.'
    : passaDoSaldo
      ? `Só há ${atual} un. em estoque.`
      : ''

  const salvar = async (e) => {
    e.preventDefault()
    setTentou(true)
    if (erroQuantidade || motivoFalta) return
    setSalvando(true)
    setErro('')
    try {
      await aoConfirmar({ quantidade: n, motivo })
    } catch (err) {
      setErro(mensagemDeErro(err))
      setSalvando(false)
    }
  }

  return (
    <Modal show onHide={salvando ? undefined : aoFechar} backdrop="static" centered>
      <Form onSubmit={salvar} noValidate>
        <Modal.Header closeButton={!salvando}>
          <Modal.Title className="h5">{cfg.titulo}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <div className="fw-semibold">{produto.nome}</div>
            <div className="small text-secondary">Saldo atual: {atual} un.</div>
          </div>

          <Form.Group className="mb-3" controlId="movimento-quantidade">
            <Form.Label>{cfg.rotuloQuantidade}</Form.Label>
            <InputGroup hasValidation>
              <Form.Control
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={quantidade}
                isInvalid={tentou && Boolean(erroQuantidade)}
                onChange={(e) => setQuantidade(e.target.value)}
                autoFocus
              />
              <InputGroup.Text>un.</InputGroup.Text>
              <Form.Control.Feedback type="invalid">{erroQuantidade}</Form.Control.Feedback>
            </InputGroup>
            {saldoDepois !== null && !passaDoSaldo && (
              <Form.Text>
                Saldo depois: <strong>{saldoDepois} un.</strong>
                {tipo === 'ajuste' && ` (${n - atual > 0 ? '+' : ''}${n - atual})`}
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group controlId="movimento-motivo">
            <Form.Label>
              Motivo{' '}
              {!cfg.motivoObrigatorio && (
                <span className="text-secondary fw-normal">(opcional)</span>
              )}
            </Form.Label>
            <Form.Control
              maxLength={255}
              placeholder={cfg.placeholderMotivo}
              value={motivo}
              isInvalid={tentou && motivoFalta}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <Form.Control.Feedback type="invalid">Informe o motivo.</Form.Control.Feedback>
          </Form.Group>

          {erro && (
            <Alert variant="danger" className="small mt-3 mb-0">
              {erro}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" className="border" onClick={aoFechar} disabled={salvando}>
            Voltar
          </Button>
          <Button type="submit" variant={cfg.variante} disabled={salvando}>
            {salvando ? <Spinner size="sm" /> : cfg.botao}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
