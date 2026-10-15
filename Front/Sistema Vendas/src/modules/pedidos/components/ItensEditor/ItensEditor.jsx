import { useState } from 'react'
import { Alert, Button, Form, Spinner, ToggleButton, ToggleButtonGroup } from 'react-bootstrap'
import EstadoVazio from '../../../../components/EstadoVazio/EstadoVazio'
import { formatarMoeda } from '../../../../utils/formatters'
import { mensagemDeErro } from '../../../../services/api'
import './ItensEditor.css'

/*
 * Lista de itens do pedido (produtos e serviços) — usada no "Novo pedido" e no detalhe.
 * Quem usa decide o que acontece em cada ação (guardar na tela ou chamar o Back).
 * As funções aoAdicionar / aoAlterarQuantidade / aoRemover podem lançar erro com a mensagem
 * que deve aparecer para o usuário (ex.: estoque insuficiente).
 *
 * saldoDisponivel(idProduto) -> quantas unidades ainda podem ser adicionadas (null = sem controle)
 */
export default function ItensEditor({
  itens,
  catalogo,
  somenteLeitura = false,
  saldoDisponivel,
  aoAdicionar,
  aoAlterarQuantidade,
  aoRemover,
}) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  const total = itens.reduce((soma, i) => soma + i.quantidade * i.valorUnitario, 0)

  // Executa uma ação mostrando carregando e capturando a mensagem de erro
  const executar = async (acao) => {
    setOcupado(true)
    setErro('')
    try {
      await acao()
      return true
    } catch (e) {
      setErro(mensagemDeErro(e))
      return false
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      {!somenteLeitura && (
        <SeletorItem
          catalogo={catalogo}
          saldoDisponivel={saldoDisponivel}
          ocupado={ocupado}
          aoAdicionar={(item) => executar(() => aoAdicionar(item))}
        />
      )}

      {erro && (
        <Alert
          variant="danger"
          className="small mx-3 mt-3 mb-0"
          dismissible
          onClose={() => setErro('')}
        >
          {erro}
        </Alert>
      )}

      {itens.length === 0 ? (
        <EstadoVazio icone="bi-basket" titulo="Nenhum item no pedido">
          {!somenteLeitura && 'Escolha um produto ou serviço acima e clique em Adicionar.'}
        </EstadoVazio>
      ) : (
        <div className="table-responsive">
          <table className="table spv-tabela">
            <thead>
              <tr>
                <th>Item</th>
                <th className="text-center">Qtd.</th>
                <th className="text-end d-none d-sm-table-cell">Valor unit.</th>
                <th className="text-end">Subtotal</th>
                {!somenteLeitura && <th className="text-end" aria-label="Ações"></th>}
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.chave}>
                  <td>
                    <div className="fw-semibold">{item.nome}</div>
                    <span className="badge text-bg-light border">
                      {item.tipoItem === 'produto' ? 'Produto' : 'Serviço'}
                    </span>
                  </td>
                  <td className="text-center">
                    {somenteLeitura ? (
                      item.quantidade
                    ) : (
                      <QuantidadeInput
                        key={`${item.chave}-${item.quantidade}`}
                        valor={item.quantidade}
                        desabilitado={ocupado}
                        rotulo={`Quantidade de ${item.nome}`}
                        aoConfirmar={(qtd) => executar(() => aoAlterarQuantidade(item, qtd))}
                      />
                    )}
                  </td>
                  <td className="text-end d-none d-sm-table-cell text-nowrap">
                    {formatarMoeda(item.valorUnitario)}
                  </td>
                  <td className="text-end fw-semibold text-nowrap">
                    {formatarMoeda(item.quantidade * item.valorUnitario)}
                  </td>
                  {!somenteLeitura && (
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant="link"
                        className="text-danger p-1"
                        title="Remover item"
                        aria-label={`Remover ${item.nome}`}
                        disabled={ocupado}
                        onClick={() => executar(() => aoRemover(item))}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="fw-semibold">
                  Total
                  {ocupado && <Spinner size="sm" className="ms-2" />}
                </td>
                <td className="d-none d-sm-table-cell"></td>
                <td className="text-end spv-total text-nowrap">{formatarMoeda(total)}</td>
                {!somenteLeitura && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  )
}

// Linha para escolher produto/serviço + quantidade
function SeletorItem({ catalogo, saldoDisponivel, ocupado, aoAdicionar }) {
  const [tipo, setTipo] = useState('produto')
  const [idSelecionado, setIdSelecionado] = useState('')
  const [quantidade, setQuantidade] = useState('1')

  const lista = tipo === 'produto' ? catalogo.produtos : catalogo.servicos
  const escolhido = lista.find((x) => x.id === Number(idSelecionado))
  const saldo = tipo === 'produto' && escolhido ? saldoDisponivel(escolhido.id) : null
  const qtd = Number(quantidade)
  const qtdValida = Number.isInteger(qtd) && qtd >= 1
  const semSaldo = saldo !== null && qtd > saldo

  const adicionar = async () => {
    if (!escolhido || !qtdValida || semSaldo) return
    const ok = await aoAdicionar({
      tipoItem: tipo,
      idProduto: tipo === 'produto' ? escolhido.id : null,
      idServico: tipo === 'servico' ? escolhido.id : null,
      nome: escolhido.nome,
      valorUnitario: escolhido.valor,
      quantidade: qtd,
    })
    if (ok) {
      setIdSelecionado('')
      setQuantidade('1')
    }
  }

  return (
    // div (e não <form>) porque este seletor fica dentro do formulário do pedido
    <div className="spv-card-body border-bottom">
      <div className="row g-2 align-items-end">
        <div className="col-12 col-md-auto">
          <ToggleButtonGroup
            type="radio"
            name="tipoItem"
            value={tipo}
            onChange={(v) => {
              setTipo(v)
              setIdSelecionado('')
            }}
          >
            <ToggleButton id="tipo-produto" value="produto" variant="outline-primary">
              Produto
            </ToggleButton>
            <ToggleButton id="tipo-servico" value="servico" variant="outline-primary">
              Serviço
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
        <div className="col">
          <Form.Label htmlFor="item-escolhido">
            {tipo === 'produto' ? 'Produto' : 'Serviço'}
          </Form.Label>
          <Form.Select
            id="item-escolhido"
            value={idSelecionado}
            onChange={(e) => setIdSelecionado(e.target.value)}
          >
            <option value="">Selecione...</option>
            {lista.map((x) => {
              const disponivel = tipo === 'produto' ? saldoDisponivel(x.id) : null
              const esgotado = disponivel !== null && disponivel <= 0
              return (
                <option key={x.id} value={x.id} disabled={esgotado}>
                  {x.nome} — {formatarMoeda(x.valor)}
                  {disponivel !== null &&
                    (esgotado ? ' (sem estoque)' : ` (estoque: ${disponivel})`)}
                </option>
              )
            })}
          </Form.Select>
        </div>
        <div className="col-4 col-md-2">
          <Form.Label htmlFor="item-quantidade">Qtd.</Form.Label>
          <Form.Control
            id="item-quantidade"
            type="number"
            min={1}
            step={1}
            max={saldo ?? undefined}
            value={quantidade}
            isInvalid={!qtdValida || semSaldo}
            onChange={(e) => setQuantidade(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionar()
              }
            }}
          />
        </div>
        <div className="col-8 col-md-auto">
          <Button
            type="button"
            className="w-100"
            disabled={!escolhido || !qtdValida || semSaldo || ocupado}
            onClick={adicionar}
          >
            <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
            Adicionar
          </Button>
        </div>
      </div>
      {semSaldo && (
        <div className="small text-danger mt-2">
          Estoque insuficiente: só há {saldo} unidade(s) disponível(is).
        </div>
      )}
      {!qtdValida && (
        <div className="small text-danger mt-2">
          A quantidade deve ser um número inteiro a partir de 1.
        </div>
      )}
    </div>
  )
}

// Campo de quantidade que só confirma ao sair do campo ou apertar Enter
function QuantidadeInput({ valor, desabilitado, rotulo, aoConfirmar }) {
  const [texto, setTexto] = useState(String(valor))

  const confirmar = async () => {
    const n = Number(texto)
    if (!Number.isInteger(n) || n < 1) {
      setTexto(String(valor))
      return
    }
    if (n === valor) return
    const ok = await aoConfirmar(n)
    if (!ok) setTexto(String(valor))
  }

  return (
    <Form.Control
      type="number"
      size="sm"
      min={1}
      step={1}
      className="spv-qtd mx-auto text-center"
      aria-label={rotulo}
      value={texto}
      disabled={desabilitado}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
    />
  )
}
