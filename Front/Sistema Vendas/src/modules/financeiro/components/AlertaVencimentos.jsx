import { Alert } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import {
  DIAS_ALERTA_VENCIMENTO,
  situacaoConta,
  somaValores,
} from '../../../services/financeiroService'
import { formatarDia, formatarMoeda } from '../../../utils/formatters'

/*
 * SPV-98 — alerta de vencimento das contas a pagar: vencidas e as que vencem em até 3 dias.
 * comLink: mostra "Ver contas" (usado na tela principal do financeiro).
 */
export default function AlertaVencimentos({ contas, comLink = false }) {
  const vencidas = contas.filter((c) => situacaoConta(c) === 'vencida')
  const vencendo = contas.filter((c) => ['vence-hoje', 'vence-logo'].includes(situacaoConta(c)))
  if (vencidas.length === 0 && vencendo.length === 0) return null

  const proximas = [...vencidas, ...vencendo].slice(0, 3)
  return (
    <Alert
      variant={vencidas.length ? 'danger' : 'warning'}
      className="py-2"
      data-testid="alerta-vencimentos"
    >
      <div className="d-flex flex-wrap align-items-center gap-2">
        <i className="bi bi-bell-fill" aria-hidden="true"></i>
        <strong>Contas a pagar precisando de atenção:</strong>
        {vencidas.length > 0 && (
          <span>
            {vencidas.length} vencida(s) ({formatarMoeda(somaValores(vencidas))})
          </span>
        )}
        {vencidas.length > 0 && vencendo.length > 0 && <span>·</span>}
        {vencendo.length > 0 && (
          <span>
            {vencendo.length} vencendo em até {DIAS_ALERTA_VENCIMENTO} dias (
            {formatarMoeda(somaValores(vencendo))})
          </span>
        )}
        {comLink && (
          <Link to="/financeiro/contas-pagar" className="ms-auto alert-link">
            Ver contas
          </Link>
        )}
      </div>
      <div className="small mt-1">
        {proximas.map((c) => `${c.descricao} (${formatarDia(c.vencimento)})`).join(' · ')}
        {vencidas.length + vencendo.length > proximas.length && ' · ...'}
      </div>
    </Alert>
  )
}
