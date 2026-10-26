import { situacaoPrazo } from '../../filtros'
import './PrazoPedido.css'

const ICONES = {
  atrasado: 'bi-alarm-fill',
  hoje: 'bi-exclamation-triangle-fill',
  atencao: 'bi-hourglass-split',
  ok: 'bi-calendar-check',
}

/*
 * SPV-115 — alerta proporcional ao prazo de entrega.
 * Mostra um selo (Atrasado / Vence hoje / Vence em X dias) e, se "barra" for true,
 * uma barrinha com quanto do prazo já passou. Não mostra nada para pedidos fechados.
 */
export default function PrazoPedido({ pedido, barra = true }) {
  const prazo = situacaoPrazo(pedido)
  if (!prazo) return null

  return (
    <span className={`spv-prazo spv-prazo-${prazo.nivel}`} title={prazo.titulo}>
      <span className="spv-prazo-selo">
        <i className={`bi ${ICONES[prazo.nivel]}`} aria-hidden="true"></i>
        {prazo.texto}
      </span>
      {barra && (
        <span
          className="spv-prazo-barra"
          role="progressbar"
          aria-label="Prazo consumido"
          aria-valuenow={prazo.percentual}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${prazo.percentual}%` }}></span>
        </span>
      )}
    </span>
  )
}
