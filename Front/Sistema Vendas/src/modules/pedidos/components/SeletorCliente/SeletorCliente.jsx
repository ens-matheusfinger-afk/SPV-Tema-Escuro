import { useState } from 'react'
import { Form, InputGroup } from 'react-bootstrap'
import { formatarDocumento, normalizarBusca } from '../../../../utils/formatters'
import { CONFIANCA_DE_ATENCAO } from '../../../../services/clientesService'

// Escolha do cliente com campo de busca (nome, fantasia, CPF/CNPJ).
// somenteAtivos: true no novo pedido; false para consultar o histórico (mostra inativos também).
export default function SeletorCliente({
  clientes,
  valor,
  aoMudar,
  invalido,
  somenteAtivos = true,
  devedores, // SPV-118: Map de clientes com conta vencida (opcional)
}) {
  const [busca, setBusca] = useState('')

  const ativos = somenteAtivos ? clientes.filter((c) => c.ativo) : clientes
  const termo = normalizarBusca(busca)
  const numeros = busca.replace(/\D/g, '')
  const filtrados = ativos.filter(
    (c) =>
      c.id === Number(valor) ||
      !termo ||
      normalizarBusca(c.nome).includes(termo) ||
      normalizarBusca(c.nomeFantasia).includes(termo) ||
      (numeros.length >= 3 && c.documento.includes(numeros)),
  )

  return (
    <>
      <InputGroup size="sm" className="mb-2">
        <InputGroup.Text>
          <i className="bi bi-search" aria-hidden="true"></i>
        </InputGroup.Text>
        <Form.Control
          placeholder="Filtrar clientes por nome ou CPF/CNPJ"
          aria-label="Filtrar clientes"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </InputGroup>
      <Form.Select
        id="cliente"
        aria-label="Cliente"
        value={valor}
        isInvalid={invalido}
        onChange={(e) => aoMudar(e.target.value)}
      >
        <option value="">
          {filtrados.length
            ? 'Selecione o cliente...'
            : 'Nenhum cliente encontrado com esse filtro'}
        </option>
        {filtrados.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
            {c.documento &&
              ` — ${c.tipo === 'PJ' ? 'CNPJ' : 'CPF'} ${formatarDocumento(c.documento)}`}
            {!c.ativo && ' (inativo)'}
            {devedores?.has(c.id) && ' ⛔ pagamento vencido'}
            {c.fatorConfianca <= CONFIANCA_DE_ATENCAO && ' ⚠ confiança baixa'}
          </option>
        ))}
      </Form.Select>
      <Form.Control.Feedback type="invalid">Selecione o cliente do pedido.</Form.Control.Feedback>
    </>
  )
}
