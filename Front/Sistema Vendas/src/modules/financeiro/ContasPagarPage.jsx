import { useState } from 'react'
import { Button, Dropdown, Form, InputGroup } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import ContaPagarFormModal from './ContaPagarFormModal'
import BaixaContaModal from './components/BaixaContaModal'
import AlertaVencimentos from './components/AlertaVencimentos'
import SituacaoConta from './components/SituacaoConta/SituacaoConta'
import { useCarregar } from '../../hooks/useCarregar'
import { useNotificacao } from '../../hooks/useNotificacao'
import { useAuth } from '../../hooks/useAuth'
import { mensagemDeErro } from '../../services/api'
import {
  DIAS_PREVISAO,
  FORMAS_DE_PAGAR,
  atualizarContaPagar,
  criarContaPagar,
  estornarPagamento,
  excluirContaPagar,
  listarContasPagar,
  pagarConta,
  situacaoConta,
  somaValores,
  venceAte,
} from '../../services/financeiroService'
import { formatarDia, formatarMoeda, hojeISO, normalizarBusca } from '../../utils/formatters'
import BotaoExportar from '../../components/BotaoExportar/BotaoExportar'
import { exportarContasPagar } from './exportarFinanceiro'
import './Financeiro.css'

const FILTROS = {
  abertas: (c) => !c.quitada,
  vencidas: (c) => situacaoConta(c) === 'vencida',
  proximas: (c) => venceAte(c, DIAS_PREVISAO),
  quitadas: (c) => c.quitada,
  todas: () => true,
}

/*
 * SPV-86 — contas a pagar: cadastro, pagamento, edição e exclusão.
 * SPV-98 — alerta de vencimento (vencidas e vencendo em até 3 dias) no topo e no menu.
 */
export default function ContasPagarPage() {
  const notificar = useNotificacao()
  const { usuario } = useAuth()
  const { dados: contas, carregando, erro, recarregar } = useCarregar(listarContasPagar, [])

  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('abertas')
  const [formulario, setFormulario] = useState(null) // { conta } (null = nova)
  const [pagando, setPagando] = useState(null)
  const [excluindo, setExcluindo] = useState(null)

  const lista = contas ?? []
  const termo = normalizarBusca(busca)
  const visiveis = lista.filter(
    (c) =>
      FILTROS[filtro](c) &&
      (!termo ||
        normalizarBusca(c.descricao).includes(termo) ||
        normalizarBusca(c.fornecedor).includes(termo) ||
        normalizarBusca(c.categoria).includes(termo)),
  )

  const mesAtual = hojeISO().slice(0, 7)
  const abertas = lista.filter(FILTROS.abertas)
  const vencidas = lista.filter(FILTROS.vencidas)
  const proximas = lista.filter(FILTROS.proximas)
  const pagasNoMes = lista.filter((c) => c.quitada && c.pagamento?.startsWith(mesAtual))

  const cartoes = [
    {
      chave: 'vencidas',
      rotulo: 'Vencidas',
      lista: vencidas,
      cor: 'var(--bs-danger)',
      icone: 'bi-exclamation-octagon',
    },
    {
      chave: 'proximas',
      rotulo: `Próximos ${DIAS_PREVISAO} dias`,
      lista: proximas,
      cor: 'var(--spv-cor-atencao)',
      icone: 'bi-calendar-week',
    },
    {
      chave: 'abertas',
      rotulo: 'Total em aberto',
      lista: abertas,
      cor: 'var(--spv-sky)',
      icone: 'bi-hourglass-split',
    },
    {
      chave: 'quitadas',
      rotulo: 'Pagas neste mês',
      lista: pagasNoMes,
      cor: 'var(--spv-emerald)',
      icone: 'bi-check-circle',
    },
  ]

  const executar = async (acao, mensagem) => {
    try {
      await acao()
      notificar(mensagem)
      await recarregar(true)
    } catch (e) {
      notificar(mensagemDeErro(e), 'danger')
    }
  }

  const salvar = async (valores) => {
    if (formulario.conta) {
      await atualizarContaPagar(formulario.conta.id, valores)
      notificar('Conta a pagar atualizada.')
    } else {
      await criarContaPagar(valores)
      notificar('Conta a pagar cadastrada.')
    }
    setFormulario(null)
    await recarregar(true)
  }

  return (
    <>
      <PageHeader
        titulo="Contas a pagar"
        subtitulo="Despesas da empresa: vencimentos, pagamentos e alertas"
      >
        <BotaoExportar
          quantidade={visiveis.length}
          aoExportar={() => exportarContasPagar(visiveis)}
        />
        <Button onClick={() => setFormulario({ conta: null })}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
          Nova conta
        </Button>
      </PageHeader>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}
      {contas && <AlertaVencimentos contas={lista} />}

      {contas && (
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
            <div className="col-md-8">
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search" aria-hidden="true"></i>
                </InputGroup.Text>
                <Form.Control
                  placeholder="Buscar por descrição, fornecedor ou categoria"
                  aria-label="Buscar contas a pagar"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </InputGroup>
            </div>
            <div className="col-md-4">
              <Form.Select
                aria-label="Situação"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              >
                <option value="abertas">Em aberto</option>
                <option value="vencidas">Vencidas</option>
                <option value="proximas">Vencem nos próximos {DIAS_PREVISAO} dias</option>
                <option value="quitadas">Pagas</option>
                <option value="todas">Todas</option>
              </Form.Select>
            </div>
          </div>
        </div>

        {carregando ? (
          <Carregando texto="Carregando contas..." />
        ) : visiveis.length === 0 ? (
          <EstadoVazio icone="bi-receipt" titulo="Nenhuma conta encontrada.">
            {lista.length === 0
              ? 'Cadastre a primeira conta no botão "Nova conta".'
              : 'Ajuste a busca ou o filtro.'}
          </EstadoVazio>
        ) : (
          <div className="table-responsive">
            <table className="table spv-tabela">
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Conta</th>
                  <th className="text-end">Valor</th>
                  <th className="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((c) => (
                  <tr key={c.id} className={c.quitada ? 'spv-conta-quitada' : ''}>
                    <td className="text-nowrap">
                      <div className="fw-semibold">{formatarDia(c.vencimento)}</div>
                      <SituacaoConta conta={c} verbo="Paga" />
                    </td>
                    <td>
                      <div className="fw-semibold">{c.descricao || '—'}</div>
                      <div className="small text-secondary">
                        <span className="badge rounded-pill text-bg-light border me-1">
                          {c.categoria}
                        </span>
                        {c.fornecedor}
                      </div>
                    </td>
                    <td className="text-end fw-semibold text-nowrap">{formatarMoeda(c.valor)}</td>
                    <td className="text-end text-nowrap">
                      {!c.quitada && (
                        <Button
                          size="sm"
                          variant="success"
                          className="me-1"
                          onClick={() => setPagando(c)}
                        >
                          <i className="bi bi-check2-circle" aria-hidden="true"></i>
                          <span className="d-none d-lg-inline ms-1">Pagar</span>
                        </Button>
                      )}
                      <Dropdown className="d-inline-block" align="end">
                        <Dropdown.Toggle size="sm" variant="light" className="border">
                          Mais
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          {c.quitada ? (
                            <Dropdown.Item
                              onClick={() =>
                                executar(
                                  () => estornarPagamento(c.id),
                                  'Pagamento desfeito: a conta voltou para "em aberto".',
                                )
                              }
                            >
                              <i
                                className="bi bi-arrow-counterclockwise me-2"
                                aria-hidden="true"
                              ></i>
                              Desfazer pagamento
                            </Dropdown.Item>
                          ) : (
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
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {contas && (
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
        <ContaPagarFormModal
          key={formulario.conta?.id ?? 'nova'}
          conta={formulario.conta}
          aoSalvar={salvar}
          aoFechar={() => setFormulario(null)}
        />
      )}

      {pagando && (
        <BaixaContaModal
          conta={pagando}
          titulo="Registrar pagamento"
          rotuloData="Pago em"
          formas={FORMAS_DE_PAGAR}
          textoConfirmar="Confirmar pagamento"
          avisoCaixa="O pagamento também sai do caixa do dia. Em dinheiro, só até o que há na gaveta."
          aoFechar={() => setPagando(null)}
          aoConfirmar={async (baixa) => {
            await pagarConta(pagando.id, { ...baixa, idUsuario: usuario.id })
            notificar(`Pagamento de ${formatarMoeda(pagando.valor)} registrado.`)
            setPagando(null)
            await recarregar(true)
          }}
        />
      )}

      <ConfirmModal
        aberto={Boolean(excluindo)}
        titulo="Excluir conta a pagar"
        textoConfirmar="Excluir"
        aoFechar={() => setExcluindo(null)}
        aoConfirmar={async () => {
          await excluirContaPagar(excluindo.id)
          notificar('Conta a pagar excluída.')
          await recarregar(true)
        }}
      >
        <p className="mb-0">
          Excluir a conta <strong>{excluindo?.descricao}</strong> ({formatarMoeda(excluindo?.valor)}
          )? Use só para lançamentos feitos por engano.
        </p>
      </ConfirmModal>
    </>
  )
}
