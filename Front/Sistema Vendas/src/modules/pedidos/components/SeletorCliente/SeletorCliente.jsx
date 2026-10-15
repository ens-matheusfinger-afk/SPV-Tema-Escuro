import { useState } from 'react'
import { Form, InputGroup } from 'react-bootstrap'
import { formatarDocumento, normalizarBusca } from '../../../../utils/formatters'

// Escolha do cliente com campo de busca (nome, fantasia, CPF/CNPJ). Só clientes ativos.
export default function SeletorCliente({ clientes, valor, aoMudar, invalido }) {
  const [busca, setBusca] = useState('')

  const ativos = clientes.filter((c) => c.ativo)
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
          </option>
        ))}
      </Form.Select>
      <Form.Control.Feedback type="invalid">Selecione o cliente do pedido.</Form.Control.Feedback>
    </>
  )
}
