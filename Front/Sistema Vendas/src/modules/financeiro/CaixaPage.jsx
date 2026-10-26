import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Form } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import BotaoExportar from '../../components/BotaoExportar/BotaoExportar'
import LancamentoCaixaModal from './caixa/LancamentoCaixaModal'
import FecharCaixaModal from './caixa/FecharCaixaModal'
import { exportarCaixaDoDia, exportarFechamentos } from './exportarFinanceiro'
import { useCarregar } from '../../hooks/useCarregar'
import { useNotificacao } from '../../hooks/useNotificacao'
import { useAuth } from '../../hooks/useAuth'
import {
  buscarCaixaDoDia,
  excluirLancamento,
  fecharCaixa,
  lancarNoCaixa,
  listarFechamentos,
} from '../../services/caixaService'
import { FORMAS_PAGAMENTO } from '../../services/financeiroService'
import { formatarDataHora, formatarDia, formatarMoeda, hojeISO } from '../../utils/formatters'
import { somarDias } from '../../utils/validacoes'
import './Financeiro.css'

const ORIGEM = {
  receber: { nome: 'Conta a receber', link: '/financeiro/contas-receber' },
  pagar: { nome: 'Conta a pagar', link: '/financeiro/contas-pagar' },
  manual: { nome: 'Manual', link: null },
}

/*
 * REQ013 — Fechamento de caixa.
 * SPV-97: entradas do dia separadas por forma de pagamento (dinheiro, PIX, cartão).
 * SPV-84: fechamento conferindo o dinheiro da gaveta; dia fechado não aceita mais lançamentos.
 * Recebimentos e pagamentos de contas entram sozinhos; aqui também entram os lançamentos manuais.
 */
export default function CaixaPage() {
  const notificar = useNotificacao()
  const { usuario } = useAuth()
  const [dia, setDia] = useState(hojeISO())
  const caixaCarga = useCarregar(() => buscarCaixaDoDia(dia), [dia])
  const historico = useCarregar(() => listarFechamentos(30), [])
  const [lancando, setLancando] = useState(false)
  const [fechando, setFechando] = useState(false)
  const [excluindo, setExcluindo] = useState(null)

  const caixa = caixaCarga.dados
  const hoje = hojeISO()
  const r = caixa?.resumo
  const fechado = Boolean(caixa?.fechamento)
  const recarregarTudo = async () => {
    await Promise.all([caixaCarga.recarregar(true), historico.recarregar(true)])
  }

  const cartoes = r
    ? [
        {
          rotulo: 'Dinheiro',
          icone: FORMAS_PAGAMENTO.dinheiro.icone,
          valor: r.entradas.dinheiro,
          cor: 'var(--spv-emerald)',
          teste: 'entrada-dinheiro',
        },
        {
          rotulo: 'PIX',
          icone: FORMAS_PAGAMENTO.pix.icone,
          valor: r.entradas.pix,
          cor: 'var(--spv-mint)',
          teste: 'entrada-pix',
        },
        {
          rotulo: 'Cartão',
          icone: FORMAS_PAGAMENTO.cartao.icone,
          valor: r.entradas.cartao,
          cor: 'var(--spv-sky)',
          teste: 'entrada-cartao',
        },
        {
          rotulo: 'Saídas do dia',
          icone: 'bi-arrow-up-circle',
          valor: r.saidas.total,
          cor: '#f07167',
          detalhe: `${formatarMoeda(r.saidas.dinheiro)} em dinheiro`,
          teste: 'saidas',
        },
      ]
    : []

  return (
    <>
      <PageHeader
        titulo="Fechamento de caixa"
        subtitulo="Entradas por forma de pagamento, saídas e conferência do dinheiro"
      >
        {caixa && (
          <BotaoExportar
            rotulo="Exportar dia"
            quantidade={caixa.lancamentos.length}
            aoExportar={() => exportarCaixaDoDia(caixa)}
          />
        )}
        <Button
          variant="outline-primary"
          disabled={!caixa || fechado || dia !== hoje}
          onClick={() => setLancando(true)}
        >
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
          Lançamento
        </Button>
        <Button
          variant="success"
          disabled={!caixa || fechado || dia > hoje}
          onClick={() => setFechando(true)}
        >
          <i className="bi bi-lock me-1" aria-hidden="true"></i>
          Fechar caixa
        </Button>
      </PageHeader>

      <div className="spv-card mb-3">
        <div className="spv-card-body d-flex flex-wrap align-items-center gap-2">
          <Button
            size="sm"
            variant="light"
            className="border"
            aria-label="Dia anterior"
            onClick={() => setDia(somarDias(dia, -1))}
          >
            <i className="bi bi-chevron-left" aria-hidden="true"></i>
          </Button>
          <Form.Control
            type="date"
            size="sm"
            style={{ maxWidth: 170 }}
            aria-label="Dia do caixa"
            value={dia}
            max={hoje}
            onChange={(e) => e.target.value && setDia(e.target.value)}
          />
          <Button
            size="sm"
            variant="light"
            className="border"
            aria-label="Próximo dia"
            disabled={dia >= hoje}
            onClick={() => setDia(somarDias(dia, 1))}
          >
            <i className="bi bi-chevron-right" aria-hidden="true"></i>
          </Button>
          {dia !== hoje && (
            <Button size="sm" variant="link" onClick={() => setDia(hoje)}>
              Ir para hoje
            </Button>
          )}
          <div className="ms-auto">
            {caixa &&
              (fechado ? (
                <Badge bg="secondary" className="fs-6" data-testid="situacao-caixa">
                  <i className="bi bi-lock-fill me-1" aria-hidden="true"></i>
                  Fechado por {caixa.fechamento.usuario} em{' '}
                  {formatarDataHora(caixa.fechamento.fechadoEm)}
                </Badge>
              ) : (
                <Badge bg="success" className="fs-6" data-testid="situacao-caixa">
                  <i className="bi bi-unlock-fill me-1" aria-hidden="true"></i>
                  Caixa aberto
                </Badge>
              ))}
          </div>
        </div>
      </div>

      {caixaCarga.erro && (
        <AlertaErro mensagem={caixaCarga.erro} aoTentarNovamente={() => caixaCarga.recarregar()} />
      )}

      {caixaCarga.carregando ? (
        <Carregando texto="Carregando caixa..." />
      ) : (
        caixa && (
          <>
            <div className="small text-secondary mb-2">
              Entradas de {formatarDia(caixa.data)} por forma de pagamento
            </div>
            <div className="row g-2 g-md-3 mb-3">
              {cartoes.map((c) => (
                <div className="col-6 col-lg-3" key={c.rotulo}>
                  <div className="spv-fin-card" style={{ '--cor': c.cor }} data-testid={c.teste}>
                    <div className="spv-fin-card-rotulo">
                      <i className={`bi ${c.icone} me-1`} aria-hidden="true"></i>
                      {c.rotulo}
                    </div>
                    <div className="spv-fin-card-valor">{formatarMoeda(c.valor)}</div>
                    {c.detalhe && <div className="spv-fin-card-detalhe">{c.detalhe}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="row g-3 mb-3">
              <div className="col-lg-8">
                <section className="spv-card h-100">
                  <div className="spv-card-header">
                    <i className="bi bi-list-ul text-secondary" aria-hidden="true"></i>
                    <h2>Lançamentos do dia</h2>
                    <span className="badge text-bg-light border">{caixa.lancamentos.length}</span>
                  </div>
                  {caixa.lancamentos.length === 0 ? (
                    <EstadoVazio icone="bi-safe" titulo="Nenhum lançamento neste dia." />
                  ) : (
                    <div className="table-responsive">
                      <table className="table spv-tabela mb-0">
                        <thead>
                          <tr>
                            <th>Hora</th>
                            <th>Descrição</th>
                            <th className="d-none d-md-table-cell">Forma</th>
                            <th className="text-end">Valor</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {caixa.lancamentos.map((l) => (
                            <tr key={l.id}>
                              <td className="text-nowrap small">
                                {new Date(l.data).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td>
                                <div>{l.descricao}</div>
                                <div className="small text-secondary">
                                  {ORIGEM[l.origem].link ? (
                                    <Link to={ORIGEM[l.origem].link}>{ORIGEM[l.origem].nome}</Link>
                                  ) : (
                                    ORIGEM[l.origem].nome
                                  )}
                                  {l.usuario && ` · ${l.usuario}`}
                                </div>
                              </td>
                              <td className="d-none d-md-table-cell small text-nowrap">
                                {l.forma && (
                                  <>
                                    <i
                                      className={`bi ${FORMAS_PAGAMENTO[l.forma]?.icone} me-1`}
                                      aria-hidden="true"
                                    ></i>
                                    {FORMAS_PAGAMENTO[l.forma]?.nome}
                                  </>
                                )}
                              </td>
                              <td
                                className={`text-end fw-semibold text-nowrap ${l.tipo === 'entrada' ? 'text-success' : 'text-danger'}`}
                              >
                                {l.tipo === 'entrada' ? '+ ' : '− '}
                                {formatarMoeda(l.valor)}
                              </td>
                              <td className="text-end">
                                {l.origem === 'manual' && !fechado && (
                                  <Button
                                    size="sm"
                                    variant="link"
                                    className="text-danger p-0"
                                    title="Excluir lançamento"
                                    aria-label="Excluir lançamento"
                                    onClick={() => setExcluindo(l)}
                                  >
                                    <i className="bi bi-trash" aria-hidden="true"></i>
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>

              <div className="col-lg-4">
                <section className="spv-card h-100">
                  <div className="spv-card-header">
                    <i className="bi bi-cash-stack text-secondary" aria-hidden="true"></i>
                    <h2>Dinheiro na gaveta</h2>
                  </div>
                  <div className="spv-card-body">
                    <table className="table table-sm mb-2">
                      <tbody>
                        <tr>
                          <td>Início do dia</td>
                          <td className="text-end">{formatarMoeda(r.saldoInicial)}</td>
                        </tr>
                        <tr>
                          <td>+ Entradas em dinheiro</td>
                          <td className="text-end">{formatarMoeda(r.entradas.dinheiro)}</td>
                        </tr>
                        <tr>
                          <td>− Saídas em dinheiro</td>
                          <td className="text-end">{formatarMoeda(r.saidas.dinheiro)}</td>
                        </tr>
                        <tr className="fw-bold">
                          <td>= Esperado</td>
                          <td className="text-end" data-testid="esperado-gaveta">
                            {formatarMoeda(r.dinheiroEsperado)}
                          </td>
                        </tr>
                        {fechado && (
                          <>
                            <tr>
                              <td>Contado no fechamento</td>
                              <td className="text-end">
                                {formatarMoeda(caixa.fechamento.dinheiroContado)}
                              </td>
                            </tr>
                            <tr
                              className={
                                caixa.fechamento.diferenca === 0 ? 'text-success' : 'text-danger'
                              }
                            >
                              <td>Diferença</td>
                              <td className="text-end fw-bold">
                                {formatarMoeda(caixa.fechamento.diferenca)}
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                    {fechado && caixa.fechamento.observacao && (
                      <div className="small text-secondary">
                        <i className="bi bi-chat-left-text me-1" aria-hidden="true"></i>
                        {caixa.fechamento.observacao}
                      </div>
                    )}
                    <div className="small text-secondary mt-2">
                      Saldo do dia (todas as formas): <strong>{formatarMoeda(r.saldoDoDia)}</strong>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </>
        )
      )}

      <section className="spv-card">
        <div className="spv-card-header">
          <i className="bi bi-clock-history text-secondary" aria-hidden="true"></i>
          <h2>Últimos fechamentos</h2>
          <div className="ms-auto">
            <BotaoExportar
              size="sm"
              rotulo="Exportar"
              quantidade={historico.dados?.length ?? 0}
              aoExportar={() => exportarFechamentos(historico.dados)}
            />
          </div>
        </div>
        {historico.carregando ? (
          <Carregando texto="Carregando fechamentos..." />
        ) : !historico.dados?.length ? (
          <EstadoVazio icone="bi-lock" titulo="Nenhum caixa fechado ainda." />
        ) : (
          <div className="table-responsive">
            <table className="table spv-tabela mb-0">
              <thead>
                <tr>
                  <th>Dia</th>
                  <th className="text-end d-none d-md-table-cell">Entradas</th>
                  <th className="text-end d-none d-md-table-cell">Saídas</th>
                  <th className="text-end">Contado</th>
                  <th className="text-end">Diferença</th>
                  <th className="d-none d-lg-table-cell">Fechado por</th>
                </tr>
              </thead>
              <tbody>
                {historico.dados.map((f) => (
                  <tr key={f.id} role="button" onClick={() => setDia(f.data)}>
                    <td className="fw-semibold">{formatarDia(f.data)}</td>
                    <td className="text-end d-none d-md-table-cell">
                      {formatarMoeda(f.entradasDinheiro + f.entradasPix + f.entradasCartao)}
                    </td>
                    <td className="text-end d-none d-md-table-cell">
                      {formatarMoeda(f.saidasDinheiro + f.saidasOutras)}
                    </td>
                    <td className="text-end">{formatarMoeda(f.dinheiroContado)}</td>
                    <td
                      className={`text-end fw-semibold ${f.diferenca === 0 ? 'text-success' : 'text-danger'}`}
                    >
                      {formatarMoeda(f.diferenca)}
                    </td>
                    <td className="d-none d-lg-table-cell small">{f.usuario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {lancando && caixa && (
        <LancamentoCaixaModal
          dinheiroDisponivel={r.dinheiroEsperado}
          aoFechar={() => setLancando(false)}
          aoSalvar={async (v) => {
            await lancarNoCaixa({ ...v, idUsuario: usuario.id })
            notificar(
              `${v.tipo === 'entrada' ? 'Entrada' : 'Saída'} de ${formatarMoeda(v.valor)} lançada.`,
            )
            setLancando(false)
            await caixaCarga.recarregar(true)
          }}
        />
      )}

      {fechando && caixa && (
        <FecharCaixaModal
          data={caixa.data}
          resumo={r}
          aoFechar={() => setFechando(false)}
          aoConfirmar={async (v) => {
            await fecharCaixa({ ...v, data: caixa.data, idUsuario: usuario.id })
            notificar(`Caixa de ${formatarDia(caixa.data)} fechado.`)
            setFechando(false)
            await recarregarTudo()
          }}
        />
      )}

      <ConfirmModal
        aberto={Boolean(excluindo)}
        titulo="Excluir lançamento"
        textoConfirmar="Excluir"
        aoFechar={() => setExcluindo(null)}
        aoConfirmar={async () => {
          await excluirLancamento(excluindo.id)
          notificar('Lançamento excluído.')
          await caixaCarga.recarregar(true)
        }}
      >
        <p className="mb-0">
          Excluir o lançamento <strong>{excluindo?.descricao}</strong> (
          {formatarMoeda(excluindo?.valor)})?
        </p>
      </ConfirmModal>
    </>
  )
}
