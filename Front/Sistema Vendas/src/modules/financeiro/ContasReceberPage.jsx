import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Dropdown, Form, InputGroup } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import ConfiancaCliente from '../../components/ConfiancaCliente/ConfiancaCliente'
import StatusBadge from '../../components/StatusBadge/StatusBadge'
import ContaReceberFormModal from './ContaReceberFormModal'
import BaixaContaModal from './components/BaixaContaModal'
import SituacaoConta from './components/SituacaoConta/SituacaoConta'
import { useCarregar } from '../../hooks/useCarregar'
import { useNotificacao } from '../../hooks/useNotificacao'
import { useAuth } from '../../hooks/useAuth'
import { mensagemDeErro } from '../../services/api'
import { listarClientes } from '../../services/clientesService'
import {
  DIAS_PREVISAO,
  FORMAS_RECEBIMENTO,
  atualizarContaReceber,
  criarContaReceber,
  encargosConta,
  estornarRecebimento,
  excluirContaReceber,
  listarContasReceber,
  receberConta,
  situacaoConta,
  somaValores,
  venceAte,
} from '../../services/financeiroService'
import { TELAS } from '../../utils/constants'
import { formatarDia, formatarMoeda, hojeISO, normalizarBusca } from '../../utils/formatters'
import BotaoExportar from '../../components/BotaoExportar/BotaoExportar'
import { exportarContasReceber } from './exportarFinanceiro'
import './Financeiro.css'

// SPV-73: em aberto e vencida -> quanto fica hoje com multa e juros; recebida -> encargos pagos
function EncargosLinha({ conta }) {
  if (conta.quitada) {
    const pagos = conta.multa + conta.juros
    return pagos > 0 ? (
      <div className="small fw-normal text-secondary">+ {formatarMoeda(pagos)} multa/juros</div>
    ) : null
  }
  const e = encargosConta(conta)
  return e.diasAtraso > 0 ? (
    <div className="small fw-normal text-danger" title="Multa de 2% + juros de 1% ao mês">
      hoje: {formatarMoeda(e.totalAtualizado)}
    </div>
  ) : null
}

const FILTROS = {
  abertas: (c) => !c.quitada,
  vencidas: (c) => situacaoConta(c) === 'vencida',
  proximas: (c) => venceAte(c, DIAS_PREVISAO),
  quitadas: (c) => c.quitada,
  todas: () => true,
}

/*
 * SPV-85 — contas a receber.
 * Contas de pedidos: criadas sozinhas (valor = total do pedido - já recebido; vencimento = entrega).
 * Contas avulsas: lançadas aqui. Recebimento pode ser parcial (ex.: sinal de 50%).
 * "Vencida" = cliente devendo (conta avulsa ou pedido já entregue). Pedido ainda não entregue
 * com a entrega atrasada aparece como "Entrega atrasada" (o atraso é da empresa, não do cliente).
 */
export default function ContasReceberPage() {
  const notificar = useNotificacao()
  const { usuario, podeAcessar } = useAuth()
  const vePedidos = podeAcessar(TELAS.PEDIDOS)
  const { dados, carregando, erro, recarregar } = useCarregar(async () => {
    const [contas, clientes] = await Promise.all([listarContasReceber(), listarClientes()])
    return { contas, clientes }
  }, [])

  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('abertas')
  const [origem, setOrigem] = useState('')
  const [formulario, setFormulario] = useState(null)
  const [recebendo, setRecebendo] = useState(null)
  const [excluindo, setExcluindo] = useState(null)

  const lista = dados?.contas ?? []
  const termo = normalizarBusca(busca)
  const numero = busca.replace(/\D/g, '')
  const visiveis = lista.filter(
    (c) =>
      FILTROS[filtro](c) &&
      (!origem || (origem === 'pedidos' ? c.idPedido : !c.idPedido)) &&
      (!termo ||
        normalizarBusca(c.cliente?.nome).includes(termo) ||
        normalizarBusca(c.descricao).includes(termo) ||
        (numero && String(c.idPedido ?? '') === numero)),
  )

  const mesAtual = hojeISO().slice(0, 7)
  const cartoes = [
    {
      chave: 'vencidas',
      rotulo: 'Vencidas (clientes devendo)',
      lista: lista.filter(FILTROS.vencidas),
      cor: 'var(--bs-danger)',
      icone: 'bi-exclamation-octagon',
    },
    {
      chave: 'proximas',
      rotulo: `Próximos ${DIAS_PREVISAO} dias`,
      lista: lista.filter(FILTROS.proximas),
      cor: '#f5b400',
      icone: 'bi-calendar-week',
    },
    {
      chave: 'abertas',
      rotulo: 'Total a receber',
      lista: lista.filter(FILTROS.abertas),
      cor: 'var(--spv-sky)',
      icone: 'bi-hourglass-split',
    },
    {
      chave: 'quitadas',
      rotulo: 'Recebido neste mês',
      lista: lista.filter((c) => c.quitada && c.recebimento?.startsWith(mesAtual)),
      cor: 'var(--spv-emerald)',
      icone: 'bi-check-circle',
    },
  ]

  const desfazer = async (c) => {
    try {
      await estornarRecebimento(c.id)
      notificar('Recebimento desfeito: o valor voltou para "a receber".')
      await recarregar(true)
    } catch (e) {
      notificar(mensagemDeErro(e), 'danger')
    }
  }

  const salvar = async (valores) => {
    if (formulario.conta) {
      await atualizarContaReceber(formulario.conta.id, valores)
      notificar('Conta a receber atualizada.')
    } else {
      await criarContaReceber(valores)
      notificar('Conta a receber cadastrada.')
    }
    setFormulario(null)
    await recarregar(true)
  }

  return (
    <>
      <PageHeader
        titulo="Contas a receber"
        subtitulo="Valores dos pedidos e contas avulsas: vencimentos e recebimentos"
      >
        <BotaoExportar
          quantidade={visiveis.length}
          aoExportar={() => exportarContasReceber(visiveis)}
        />
        <Button onClick={() => setFormulario({ conta: null })}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
          Conta avulsa
        </Button>
      </PageHeader>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}

      {dados && (
        <div className="row g-2 g-md-3 mb-3">
          {cartoes.map((c) => (
            <div className="col-6 col-lg-3" key={c.chave}>
              <button
                type="button"
                className={`spv-fin-card ${filtro === c.chave ? 'ativo' : ''}`}
                style={{ '--cor': c.cor }}
                aria-pressed={filtro === c.chave}
                onClick={() => setFiltro(c.chave)}
              >
                <div className="spv-fin-card-rotulo">
                  <i className={`bi ${c.icone} me-1`} aria-hidden="true"></i>
                  {c.rotulo}
                </div>
                <div
                  className={`spv-fin-card-valor ${c.chave === 'vencidas' && c.lista.length ? 'text-danger' : ''}`}
                >
                  {formatarMoeda(somaValores(c.lista))}
                </div>
                <div className="spv-fin-card-detalhe">{c.lista.length} conta(s)</div>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="spv-card">
        <div className="spv-card-body border-bottom">
          <div className="row g-2">
            <div className="col-md-6">
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search" aria-hidden="true"></i>
                </InputGroup.Text>
                <Form.Control
                  placeholder="Buscar por cliente, descrição ou nº do pedido"
                  aria-label="Buscar contas a receber"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </InputGroup>
            </div>
            <div className="col-6 col-md-3">
              <Form.Select
                aria-label="Situação"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              >
                <option value="abertas">A receber</option>
                <option value="vencidas">Vencidas</option>
                <option value="proximas">Vencem em {DIAS_PREVISAO} dias</option>
                <option value="quitadas">Recebidas</option>
                <option value="todas">Todas</option>
              </Form.Select>
            </div>
            <div className="col-6 col-md-3">
              <Form.Select
                aria-label="Origem"
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
              >
                <option value="">Pedidos e avulsas</option>
                <option value="pedidos">Só de pedidos</option>
                <option value="avulsas">Só avulsas</option>
              </Form.Select>
            </div>
          </div>
        </div>

        {carregando ? (
          <Carregando texto="Carregando contas..." />
        ) : visiveis.length === 0 ? (
          <EstadoVazio icone="bi-cash-stack" titulo="Nenhuma conta encontrada.">
            Ajuste a busca ou os filtros.
          </EstadoVazio>
        ) : (
          <div className="table-responsive">
            <table className="table spv-tabela">
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Cliente</th>
                  <th className="d-none d-md-table-cell">Origem</th>
                  <th className="text-end">Valor</th>
                  <th className="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((c) => (
                  <tr key={c.id} className={c.quitada ? 'spv-conta-quitada' : ''}>
                    <td className="text-nowrap">
                      <div className="fw-semibold">{formatarDia(c.vencimento)}</div>
                      <SituacaoConta conta={c} verbo="Recebida" />
                    </td>
                    <td>
                      <div className="fw-semibold">{c.cliente?.nome ?? '—'}</div>
                      {c.cliente && <ConfiancaCliente fator={c.cliente.fatorConfianca} compacto />}
                    </td>
                    <td className="d-none d-md-table-cell small">
                      {c.idPedido ? (
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          {vePedidos ? (
                            <Link to={`/pedidos/${c.idPedido}`}>Pedido nº {c.idPedido}</Link>
                          ) : (
                            `Pedido nº ${c.idPedido}`
                          )}
                          {c.pedido && <StatusBadge status={c.pedido.status} />}
                        </div>
                      ) : (
                        <span className="badge rounded-pill text-bg-light border">Avulsa</span>
                      )}
                      <div className="text-secondary text-truncate" style={{ maxWidth: 260 }}>
                        {c.idPedido ? c.pedido?.descricao : c.descricao}
                      </div>
                    </td>
                    <td className="text-end fw-semibold text-nowrap">
                      {formatarMoeda(c.valor)}
                      <EncargosLinha conta={c} />
                    </td>
                    <td className="text-end text-nowrap">
                      {!c.quitada && (
                        <Button
                          size="sm"
                          variant="success"
                          className="me-1"
                          onClick={() => setRecebendo(c)}
                        >
                          <i className="bi bi-cash-coin" aria-hidden="true"></i>
                          <span className="d-none d-lg-inline ms-1">Receber</span>
                        </Button>
                      )}
                      <Dropdown className="d-inline-block" align="end">
                        <Dropdown.Toggle size="sm" variant="light" className="border">
                          Mais
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          {c.quitada && (
                            <Dropdown.Item onClick={() => desfazer(c)}>
                              <i
                                className="bi bi-arrow-counterclockwise me-2"
                                aria-hidden="true"
                              ></i>
                              Desfazer recebimento
                            </Dropdown.Item>
                          )}
                          {!c.quitada && !c.idPedido && (
                            <>
                              <Dropdown.Item onClick={() => setFormulario({ conta: c })}>
                                <i className="bi bi-pencil me-2" aria-hidden="true"></i>
                                Editar
                              </Dropdown.Item>
                              <Dropdown.Item
                                className="text-danger"
                                onClick={() => setExcluindo(c)}
                              >
                                <i className="bi bi-trash me-2" aria-hidden="true"></i>
                                Excluir
                              </Dropdown.Item>
                            </>
                          )}
                          {c.idPedido && vePedidos && (
                            <Dropdown.Item as={Link} to={`/pedidos/${c.idPedido}`}>
                              <i className="bi bi-receipt me-2" aria-hidden="true"></i>
                              Abrir pedido
                            </Dropdown.Item>
                          )}
                          {c.idPedido && !c.quitada && (
                            <Dropdown.ItemText
                              className="small text-secondary"
                              style={{ maxWidth: 240 }}
                            >
                              Valor e vencimento seguem o pedido (itens e data de entrega).
                            </Dropdown.ItemText>
                          )}
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {dados && (
          <div className="px-3 py-2 small text-secondary border-top d-flex flex-wrap gap-2">
            <span>
              {visiveis.length} de {lista.length} conta(s)
            </span>
            <span className="ms-auto fw-semibold">
              Total da lista: {formatarMoeda(somaValores(visiveis))}
            </span>
          </div>
        )}
      </div>

      {formulario && (
        <ContaReceberFormModal
          key={formulario.conta?.id ?? 'nova'}
          conta={formulario.conta}
          clientes={dados?.clientes ?? []}
          aoSalvar={salvar}
          aoFechar={() => setFormulario(null)}
        />
      )}

      {recebendo && (
        <BaixaContaModal
          conta={recebendo}
          titulo="Registrar recebimento"
          rotuloData="Recebido em"
          formas={FORMAS_RECEBIMENTO}
          parcial
          textoConfirmar="Confirmar recebimento"
          avisoCaixa="O valor recebido também entra no caixa do dia, na forma de pagamento escolhida."
          encargosDe={(dia) => encargosConta(recebendo, dia)}
          aoFechar={() => setRecebendo(null)}
          aoConfirmar={async (baixa) => {
            const { restante, encargos } = await receberConta(recebendo.id, {
              ...baixa,
              idUsuario: usuario.id,
            })
            const extra = encargos > 0 ? ` Inclui ${formatarMoeda(encargos)} de multa e juros.` : ''
            notificar(
              restante > 0
                ? `Recebimento parcial registrado. Ainda faltam ${formatarMoeda(restante)}.${extra}`
                : `Recebimento registrado.${extra}`,
            )
            setRecebendo(null)
            await recarregar(true)
          }}
        />
      )}

      <ConfirmModal
        aberto={Boolean(excluindo)}
        titulo="Excluir conta a receber"
        textoConfirmar="Excluir"
        aoFechar={() => setExcluindo(null)}
        aoConfirmar={async () => {
          await excluirContaReceber(excluindo.id)
          notificar('Conta a receber excluída.')
          await recarregar(true)
        }}
      >
        <p className="mb-0">
          Excluir a conta <strong>{excluindo?.descricao}</strong> de {excluindo?.cliente?.nome} (
          {formatarMoeda(excluindo?.valor)})? Use só para lançamentos feitos por engano.
        </p>
      </ConfirmModal>
    </>
  )
}
