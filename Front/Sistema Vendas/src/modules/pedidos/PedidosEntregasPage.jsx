import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import StatusBadge from '../../components/StatusBadge/StatusBadge'
import BotaoExportar from '../../components/BotaoExportar/BotaoExportar'
import PrazoPedido from './components/PrazoPedido/PrazoPedido'
import { usePedidos } from './usePedidos'
import { exportarPedidos } from './exportarPedidos'
import { STATUS_ABERTOS } from '../../utils/constants'
import { diaParaInput, formatarMoeda, hojeISO } from '../../utils/formatters'
import { somarDias } from '../../utils/validacoes'
import './PedidosEntregasPage.css'

const DIAS = 30
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

// "2026-10-23" -> "quinta, 23/10" (Hoje / Amanhã quando for o caso)
function rotuloDoDia(iso, hoje) {
  if (iso === hoje) return 'Hoje'
  if (iso === somarDias(hoje, 1)) return 'Amanhã'
  const [ano, mes, dia] = iso.split('-').map(Number)
  const semana = SEMANA[new Date(ano, mes - 1, dia).getDay()]
  return `${semana}, ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
}

// Uma linha da agenda: número, cliente/descrição, status e total
function LinhaPedido({ p }) {
  return (
    <div className="spv-entrega">
      <Link to={`/pedidos/${p.id}`} className="spv-entrega-num">
        #{p.id}
      </Link>
      <div className="spv-entrega-info">
        <div className="fw-semibold text-truncate">
          {p.cliente?.nome ?? `Cliente ${p.idCliente}`}
        </div>
        {p.descricao && <div className="small text-secondary text-truncate">{p.descricao}</div>}
      </div>
      <div className="spv-entrega-status">
        <StatusBadge status={p.status} />
      </div>
      <div className="spv-entrega-total">{formatarMoeda(p.total)}</div>
    </div>
  )
}

/*
 * SPV-116 — resumo dos pedidos a entregar nos próximos 30 dias.
 * Pedidos em aberto (Cadastrado até Aguardando cliente) agrupados por dia de entrega,
 * com os atrasados no topo. Serve para planejar a semana e avisar clientes.
 */
export default function PedidosEntregasPage() {
  const { dados: todos, carregando, erro, recarregar } = usePedidos()
  const hoje = hojeISO()
  const limite = somarDias(hoje, DIAS)
  const em7dias = somarDias(hoje, 6)

  const abertos = (todos ?? []).filter(
    (p) => STATUS_ABERTOS.includes(p.status) && p.dataEntregaPrevista,
  )
  const comDia = abertos.map((p) => ({ ...p, dia: diaParaInput(p.dataEntregaPrevista) }))
  const atrasados = comDia.filter((p) => p.dia < hoje).sort((a, b) => a.dia.localeCompare(b.dia))
  const proximos = comDia
    .filter((p) => p.dia >= hoje && p.dia <= limite)
    .sort((a, b) => a.dia.localeCompare(b.dia) || a.id - b.id)
  const semData = (todos ?? []).filter(
    (p) => STATUS_ABERTOS.includes(p.status) && !p.dataEntregaPrevista,
  )

  // agrupa por dia
  const porDia = []
  for (const p of proximos) {
    const grupo = porDia.at(-1)
    if (grupo?.dia === p.dia) grupo.pedidos.push(p)
    else porDia.push({ dia: p.dia, pedidos: [p] })
  }

  const soma = (lista) => lista.reduce((s, p) => s + p.total, 0)
  const nestaSemana = proximos.filter((p) => p.dia <= em7dias)
  const prontos = proximos.filter((p) => p.status === 4).length

  const cartoes = [
    {
      rotulo: 'Atrasados',
      valor: atrasados.length,
      detalhe: formatarMoeda(soma(atrasados)),
      cor: 'var(--bs-danger)',
      icone: 'bi-alarm',
      alerta: atrasados.length > 0,
    },
    {
      rotulo: 'Próximos 7 dias',
      valor: nestaSemana.length,
      detalhe: formatarMoeda(soma(nestaSemana)),
      cor: 'var(--spv-cor-atencao)',
      icone: 'bi-calendar-week',
    },
    {
      rotulo: `Próximos ${DIAS} dias`,
      valor: proximos.length,
      detalhe: formatarMoeda(soma(proximos)),
      cor: 'var(--spv-sky)',
      icone: 'bi-calendar3',
    },
    {
      rotulo: 'Já prontos p/ retirada',
      valor: prontos,
      detalhe: 'aguardando o cliente',
      cor: 'var(--spv-emerald)',
      icone: 'bi-bag-check',
    },
  ]

  return (
    <>
      <PageHeader
        titulo="Próximas entregas"
        subtitulo={`Pedidos em aberto com entrega nos próximos ${DIAS} dias, dia a dia`}
      >
        <BotaoExportar
          quantidade={atrasados.length + proximos.length}
          aoExportar={() => exportarPedidos([...atrasados, ...proximos], 'entregas-30-dias')}
        />
      </PageHeader>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}

      {carregando ? (
        <Carregando texto="Carregando pedidos..." />
      ) : (
        todos && (
          <>
            <div className="row g-2 g-md-3 mb-3">
              {cartoes.map((c) => (
                <div className="col-6 col-lg-3" key={c.rotulo}>
                  <div className="spv-entregas-resumo" style={{ '--cor': c.cor }}>
                    <div className="spv-entregas-resumo-rotulo">
                      <i className={`bi ${c.icone} me-1`} aria-hidden="true"></i>
                      {c.rotulo}
                    </div>
                    <div className={`spv-entregas-resumo-valor ${c.alerta ? 'text-danger' : ''}`}>
                      {c.valor}
                    </div>
                    <div className="spv-entregas-resumo-detalhe">{c.detalhe}</div>
                  </div>
                </div>
              ))}
            </div>

            {atrasados.length > 0 && (
              <section className="spv-card spv-dia-atrasado mb-3">
                <div className="spv-card-header">
                  <i className="bi bi-alarm text-danger" aria-hidden="true"></i>
                  <h2 className="text-danger">Atrasados</h2>
                  <span className="badge text-bg-danger">{atrasados.length}</span>
                  <span className="small text-secondary ms-auto">
                    {formatarMoeda(soma(atrasados))}
                  </span>
                </div>
                <ul className="spv-entregas">
                  {atrasados.map((p) => (
                    <li key={p.id} className="spv-entrega-wrap">
                      <LinhaPedido p={p} />
                      <div className="spv-entrega-prazo">
                        <PrazoPedido pedido={p} barra={false} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {porDia.length === 0 ? (
              <div className="spv-card">
                <EstadoVazio
                  icone="bi-calendar-check"
                  titulo={`Nenhuma entrega nos próximos ${DIAS} dias.`}
                />
              </div>
            ) : (
              porDia.map((g) => (
                <section
                  key={g.dia}
                  className={`spv-card mb-3 ${g.dia === hoje ? 'spv-dia-hoje' : ''}`}
                >
                  <div className="spv-card-header">
                    <i className="bi bi-calendar-event text-secondary" aria-hidden="true"></i>
                    <h2 className="text-capitalize">{rotuloDoDia(g.dia, hoje)}</h2>
                    <span className="badge text-bg-light border">{g.pedidos.length}</span>
                    <span className="small text-secondary ms-auto">
                      {formatarMoeda(soma(g.pedidos))}
                    </span>
                  </div>
                  <ul className="spv-entregas">
                    {g.pedidos.map((p) => (
                      <li key={p.id}>
                        <LinhaPedido p={p} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}

            {semData.length > 0 && (
              <p className="small text-secondary">
                {semData.length} pedido(s) em aberto sem data de entrega não aparecem aqui.
              </p>
            )}
          </>
        )
      )}
    </>
  )
}
