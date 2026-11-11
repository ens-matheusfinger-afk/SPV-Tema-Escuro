import { STATUS_ABERTOS } from '../../../../utils/constants'
import { formatarData, formatarMoeda } from '../../../../utils/formatters'
import { pedidoAtrasado } from '../../filtros'
import './ResumoCliente.css'

const STATUS_FINALIZADO = 5

/*
 * SPV-59 — números do cliente: pedidos em aberto (e quanto valem), atrasados,
 * total já comprado (pedidos finalizados) e data do último pedido.
 */
export default function ResumoCliente({ pedidos }) {
  const abertos = pedidos.filter((p) => STATUS_ABERTOS.includes(p.status))
  const finalizados = pedidos.filter((p) => p.status === STATUS_FINALIZADO)
  const atrasados = abertos.filter(pedidoAtrasado).length
  const soma = (lista) => lista.reduce((s, p) => s + p.total, 0)
  const ultimo = pedidos.reduce(
    (maisRecente, p) =>
      !maisRecente || new Date(p.dataCriacao) > new Date(maisRecente) ? p.dataCriacao : maisRecente,
    null,
  )

  const cartoes = [
    {
      rotulo: 'Em aberto',
      valor: abertos.length,
      detalhe: formatarMoeda(soma(abertos)),
      icone: 'bi-hourglass-split',
      cor: 'var(--spv-sky)',
    },
    {
      rotulo: 'Atrasados',
      valor: atrasados,
      detalhe: atrasados ? 'precisam de atenção' : 'nenhum',
      icone: 'bi-alarm',
      cor: 'var(--bs-danger)',
      alerta: atrasados > 0,
    },
    {
      rotulo: 'Total comprado',
      valor: formatarMoeda(soma(finalizados)),
      detalhe: `${finalizados.length} pedido(s) finalizado(s)`,
      icone: 'bi-cash-coin',
      cor: 'var(--spv-emerald)',
    },
    {
      rotulo: 'Último pedido',
      valor: ultimo ? formatarData(ultimo) : '—',
      detalhe: `${pedidos.length} pedido(s) no total`,
      icone: 'bi-calendar3',
      cor: 'var(--spv-cor-neutra)',
    },
  ]

  return (
    <div className="row g-2 g-md-3 mb-3">
      {cartoes.map((c) => (
        <div className="col-6 col-lg-3" key={c.rotulo}>
          <div className="spv-resumo-cliente" style={{ '--cor': c.cor }}>
            <div className="spv-resumo-cliente-rotulo">
              <i className={`bi ${c.icone} me-1`} aria-hidden="true"></i>
              {c.rotulo}
            </div>
            <div className={`spv-resumo-cliente-valor ${c.alerta ? 'text-danger' : ''}`}>
              {c.valor}
            </div>
            <div className="spv-resumo-cliente-detalhe">{c.detalhe}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
