import { contarAlertasPagar } from '../services/financeiroService'
import { useContadorMenu } from './useContadorMenu'

// SPV-98 — contas a pagar vencidas ou vencendo em até 3 dias (aviso no menu lateral)
export function useAlertasContasPagar(ativo, atualizarEm) {
  return useContadorMenu(ativo, atualizarEm, contarAlertasPagar)
}
