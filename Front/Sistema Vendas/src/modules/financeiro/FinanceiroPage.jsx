import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import AlertaVencimentos from './components/AlertaVencimentos'
import SituacaoConta from './components/SituacaoConta/SituacaoConta'
import { useCarregar } from '../../hooks/useCarregar'
import { useAuth } from '../../hooks/useAuth'
import {
  DIAS_PREVISAO,
  listarContasPagar,
  listarContasReceber,
  situacaoConta,
  somaValores,
  venceAte,
} from '../../services/financeiroService'
import { TELAS } from '../../utils/constants'
import { formatarDia, formatarMoeda, hojeISO } from '../../utils/formatters'
import { somarDias } from '../../utils/validacoes'
import './Financeiro.css'

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function rotuloDia(iso, hoje) {
  if (iso === hoje) return 'Hoje'
  if (iso === somarDias(hoje, 1)) return 'Amanhã'
  const [a, m, d] = iso.split('-').map(Number)
  return `${SEMANA[new Date(a, m - 1, d).getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

// Previsão dia a dia (hoje + 14 dias): entradas, saídas e saldo acumulado
function montarPrevisao(hoje, receber, pagar) {
  let acumulado = 0
  return Array.from({ length: DIAS_PREVISAO }, (_, i) => {
    const dia = somarDias(hoje, i)
    const entradas = somaValores(receber.filter((c) => c.vencimento === dia))
    const saidas = somaValores(pagar.filter((c) => c.vencimento === dia))
    acumulado += entradas - saidas
    return { dia, entradas, saidas, acumulado }
  })
}

// Lista curta de próximas contas (pagamentos ou recebimentos)
function ProximasContas({ titulo, icone, contas, link, verbo, vazio }) {
  return (
    <section className="spv-card h-100">
      <div className="spv-card-header">
        <i className={`bi ${icone} text-secondary`} aria-hidden="true"></i>
        <h2>{titulo}</h2>
        <Link to={link} className="ms-auto small">
          Ver todas
        </Link>
      </div>
      {contas.length === 0 ? (
        <EstadoVazio icone="bi-check2-all" titulo={vazio} />
      ) : (
        <ul className="list-unstyled mb-0">
          {contas.map((c) => (
            <li key={c.id} className="d-flex align-items-center gap-2 px-3 py-2 border-top">
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="fw-semibold text-truncate">{c.cliente?.nome ?? c.descricao}</div>
                <div className="small">
                  <span className="text-secondary me-2">{formatarDia(c.vencimento)}</span>
                  <SituacaoConta conta={c} verbo={verbo} />
                </div>
              </div>
              <div className="fw-semibold text-nowrap">{formatarMoeda(c.valor)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/*
 * SPV-82 — tela principal do módulo financeiro.
 * SPV-99/100 — valor estimado a pagar e a receber nos próximos 15 dias (e o saldo previsto, dia a dia).
 * SPV-98 — alerta das contas a pagar vencidas ou vencendo.
 * Cada parte só aparece para quem tem a permissão da tela correspondente.
 */
export default function FinanceiroPage() {
  const { podeAcessar } = useAuth()
  const vePagar = podeAcessar(TELAS.CONTAS_PAGAR)
  const veReceber = podeAcessar(TELAS.CONTAS_RECEBER)

  const { dados, carregando, erro, recarregar } = useCarregar(async () => {
    const [pagar, receber] = await Promise.all([
      vePagar ? listarContasPagar() : Promise.resolve([]),
      veReceber ? listarContasReceber() : Promise.resolve([]),
    ])
    return { pagar, receber }
  }, [])

  const hoje = hojeISO()
  const mes = hoje.slice(0, 7)
  const pagar = dados?.pagar ?? []
  const receber = dados?.receber ?? []

  const pagar15 = pagar.filter((c) => venceAte(c, DIAS_PREVISAO - 1))
  const receber15 = receber.filter((c) => venceAte(c, DIAS_PREVISAO - 1))
  const pagarVencidas = pagar.filter((c) => situacaoConta(c) === 'vencida')
  const receberVencidas = receber.filter((c) => situacaoConta(c) === 'vencida')
  const saldo15 = somaValores(receber15) - somaValores(pagar15)
  const resultadoMes =
    somaValores(receber.filter((c) => c.quitada && c.recebimento?.startsWith(mes))) -
    somaValores(pagar.filter((c) => c.quitada && c.pagamento?.startsWith(mes)))

  // Previsão dia a dia (hoje + 14 dias)
  const dias = montarPrevisao(hoje, receber15, pagar15)
  const maior = Math.max(1, ...dias.map((d) => Math.max(d.entradas, d.saidas)))
  const largura = (v) => `${Math.round((v / maior) * 100)}%`

  const cartoes = [
    veReceber && {
      rotulo: `A receber em ${DIAS_PREVISAO} dias`,
      valor: formatarMoeda(somaValores(receber15)),
      detalhe: `${receber15.length} conta(s)${receberVencidas.length ? ` · + ${formatarMoeda(somaValores(receberVencidas))} vencidas` : ''}`,
      cor: 'var(--spv-emerald)',
      icone: 'bi-arrow-down-circle',
      teste: 'previsao-receber',
    },
    vePagar && {
      rotulo: `A pagar em ${DIAS_PREVISAO} dias`,
      valor: formatarMoeda(somaValores(pagar15)),
      detalhe: `${pagar15.length} conta(s)${pagarVencidas.length ? ` · + ${formatarMoeda(somaValores(pagarVencidas))} vencidas` : ''}`,
      cor: 'var(--spv-cor-saida)',
      icone: 'bi-arrow-up-circle',
      teste: 'previsao-pagar',
    },
    vePagar &&
      veReceber && {
        rotulo: `Saldo previsto em ${DIAS_PREVISAO} dias`,
        valor: formatarMoeda(saldo15),
        detalhe: 'a receber − a pagar no período',
        cor: saldo15 >= 0 ? 'var(--spv-sky)' : 'var(--bs-danger)',
        icone: 'bi-graph-up-arrow',
        alerta: saldo15 < 0,
        teste: 'saldo-previsto',
      },
    vePagar &&
      veReceber && {
        rotulo: 'Resultado do mês',
        valor: formatarMoeda(resultadoMes),
        detalhe: 'recebido − pago neste mês',
        cor: resultadoMes >= 0 ? 'var(--spv-mint)' : 'var(--bs-danger)',
        icone: 'bi-calendar-check',
        alerta: resultadoMes < 0,
      },
  ].filter(Boolean)

  return (
    <>
      <PageHeader
        titulo="Financeiro"
        subtitulo={`Visão geral: vencimentos, previsão dos próximos ${DIAS_PREVISAO} dias e resultado do mês`}
      />

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}

      {carregando ? (
        <Carregando texto="Carregando financeiro..." />
      ) : (
        dados && (
          <>
            {vePagar && <AlertaVencimentos contas={pagar} comLink />}

            <div className="row g-2 g-md-3 mb-3">
              {cartoes.map((c) => (
                <div className="col-6 col-lg-3" key={c.rotulo}>
                  <div className="spv-fin-card" style={{ '--cor': c.cor }} data-testid={c.teste}>
                    <div className="spv-fin-card-rotulo">
                      <i className={`bi ${c.icone} me-1`} aria-hidden="true"></i>
                      {c.rotulo}
                    </div>
                    <div className={`spv-fin-card-valor ${c.alerta ? 'text-danger' : ''}`}>
                      {c.valor}
                    </div>
                    <div className="spv-fin-card-detalhe">{c.detalhe}</div>
                  </div>
                </div>
              ))}
            </div>

            <section className="spv-card mb-3">
              <div className="spv-card-header">
                <i className="bi bi-bar-chart-steps text-secondary" aria-hidden="true"></i>
                <h2>Próximos {DIAS_PREVISAO} dias</h2>
                <span className="small text-secondary ms-auto d-none d-sm-inline">
                  {veReceber && (
                    <>
                      <i
                        className="bi bi-circle-fill me-1"
                        style={{ color: 'var(--spv-emerald)' }}
                        aria-hidden="true"
                      ></i>
                      a receber
                    </>
                  )}
                  {vePagar && (
                    <>
                      <i
                        className="bi bi-circle-fill ms-3 me-1"
                        style={{ color: 'var(--spv-cor-saida)' }}
                        aria-hidden="true"
                      ></i>
                      a pagar
                    </>
                  )}
                </span>
              </div>
              <ul className="spv-previsao">
                {dias.map((d) => (
                  <li key={d.dia} className={d.entradas || d.saidas ? '' : 'text-secondary'}>
                    <span className="text-capitalize fw-semibold">{rotuloDia(d.dia, hoje)}</span>
                    <span className="spv-previsao-barra spv-previsao-entrada">
                      {d.entradas > 0 && (
                        <>
                          <span style={{ width: largura(d.entradas) }}></span>
                          {formatarMoeda(d.entradas)}
                        </>
                      )}
                    </span>
                    <span className="spv-previsao-barra spv-previsao-saida">
                      {d.saidas > 0 && (
                        <>
                          <span style={{ width: largura(d.saidas) }}></span>
                          {formatarMoeda(d.saidas)}
                        </>
                      )}
                    </span>
                    <span
                      className={`spv-previsao-saldo ${d.acumulado < 0 ? 'text-danger' : ''}`}
                      title="Saldo acumulado da previsão"
                    >
                      {formatarMoeda(d.acumulado)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="px-3 py-2 small text-secondary border-top">
                Valores das contas em aberto pela data de vencimento. A última coluna é o saldo
                acumulado da previsão (não inclui o que já está vencido).
              </div>
            </section>

            <div className="row g-3">
              {vePagar && (
                <div className="col-lg-6">
                  <ProximasContas
                    titulo="Próximos pagamentos"
                    icone="bi-arrow-up-circle"
                    contas={pagar.filter((c) => !c.quitada).slice(0, 6)}
                    link="/financeiro/contas-pagar"
                    verbo="Paga"
                    vazio="Nenhuma conta a pagar em aberto."
                  />
                </div>
              )}
              {veReceber && (
                <div className="col-lg-6">
                  <ProximasContas
                    titulo="Próximos recebimentos"
                    icone="bi-arrow-down-circle"
                    contas={receber.filter((c) => !c.quitada).slice(0, 6)}
                    link="/financeiro/contas-receber"
                    verbo="Recebida"
                    vazio="Nenhum valor a receber."
                  />
                </div>
              )}
            </div>
          </>
        )
      )}
    </>
  )
}
