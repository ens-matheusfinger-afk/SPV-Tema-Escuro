import {
  FORMAS_PAGAMENTO,
  diasAteVencimento,
  situacaoConta,
} from '../../../../services/financeiroService'
import { formatarDia } from '../../../../utils/formatters'
import './SituacaoConta.css'

/*
 * Selo da situação de uma conta a pagar/receber: quitada, vencida, vence hoje,
 * vence em X dias... (SPV-85/86/98).
 * verbo: 'Paga' (contas a pagar) ou 'Recebida' (contas a receber).
 */
export default function SituacaoConta({ conta, verbo = 'Paga' }) {
  const situacao = situacaoConta(conta)
  const dias = diasAteVencimento(conta.vencimento)

  const textos = {
    quitada: `${verbo} em ${formatarDia(conta.quitada && (conta.pagamento ?? conta.recebimento))}`,
    vencida: `Vencida há ${-dias} dia(s)`,
    'pedido-atrasado': `Entrega atrasada ${-dias} dia(s)`,
    'vence-hoje': 'Vence hoje',
    'vence-logo': `Vence em ${dias} dia(s)`,
    'a-vencer': `Vence em ${dias} dias`,
    'sem-vencimento': 'Sem vencimento',
  }
  const icones = {
    quitada: 'bi-check-circle-fill',
    vencida: 'bi-exclamation-octagon-fill',
    'pedido-atrasado': 'bi-truck',
    'vence-hoje': 'bi-exclamation-triangle-fill',
    'vence-logo': 'bi-hourglass-split',
    'a-vencer': 'bi-calendar',
    'sem-vencimento': 'bi-dash-circle',
  }
  const forma = conta.quitada && FORMAS_PAGAMENTO[conta.forma]

  return (
    <span className={`spv-situacao-conta spv-situacao-${situacao}`}>
      <i className={`bi ${icones[situacao]}`} aria-hidden="true"></i>
      {textos[situacao]}
      {forma && <span className="spv-situacao-forma"> · {forma.nome}</span>}
    </span>
  )
}
