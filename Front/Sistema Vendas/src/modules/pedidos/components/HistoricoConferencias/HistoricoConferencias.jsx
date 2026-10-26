import Carregando from '../../../../components/Carregando/Carregando'
import { useCarregar } from '../../../../hooks/useCarregar'
import { listarConferencias } from '../../../../services/conferenciaService'
import { formatarDataHora } from '../../../../utils/formatters'

/*
 * SPV-96 — histórico de conferências do pedido: cada aprovação ou devolução,
 * com conferente, data e motivo. Só aparece se o pedido já foi conferido alguma vez.
 */
export default function HistoricoConferencias({ idPedido, atualizarEm }) {
  const { dados, carregando } = useCarregar(
    () => listarConferencias(idPedido),
    [idPedido, atualizarEm],
  )

  if (carregando) {
    return (
      <section className="spv-card">
        <Carregando texto="Carregando conferências..." />
      </section>
    )
  }
  if (!dados?.length) return null

  const devolucoes = dados.filter((c) => c.resultado === 'devolvido').length

  return (
    <section className="spv-card">
      <div className="spv-card-header">
        <i className="bi bi-clipboard-check text-secondary" aria-hidden="true"></i>
        <h2>Conferência</h2>
        {devolucoes > 0 && (
          <span className="badge text-bg-danger bg-opacity-75">{devolucoes} devolução(ões)</span>
        )}
      </div>
      <div className="spv-card-body small">
        <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
          {dados.map((c, i) => (
            <li key={c.id} className={i > 0 ? 'border-top pt-2' : undefined}>
              <div className="d-flex justify-content-between gap-2">
                <span className="fw-semibold">{c.conferente}</span>
                {c.resultado === 'aprovado' ? (
                  <span className="badge text-bg-success">Aprovado</span>
                ) : (
                  <span className="badge text-bg-danger">Devolvido</span>
                )}
              </div>
              <div className="text-secondary">{formatarDataHora(c.data)}</div>
              {c.motivo && (
                <div className={c.resultado === 'devolvido' ? 'text-danger' : 'fst-italic'}>
                  {c.motivo}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
