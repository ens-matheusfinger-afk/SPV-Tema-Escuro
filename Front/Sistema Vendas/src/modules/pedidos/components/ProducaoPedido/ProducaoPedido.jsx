import { Link } from 'react-router-dom'
import Carregando from '../../../../components/Carregando/Carregando'
import { useCarregar } from '../../../../hooks/useCarregar'
import { useAuth } from '../../../../hooks/useAuth'
import { listarApontamentosDoPedido, minutosEntre } from '../../../../services/producaoService'
import { TELAS } from '../../../../utils/constants'
import { formatarDataHora, formatarDuracao } from '../../../../utils/formatters'

/*
 * SPV-95 — histórico de produção do pedido: quem trabalhou, quando, quanto tempo
 * e quanto produziu. Os apontamentos são feitos na tela Produção (M.E.S.).
 * atualizarEm: muda quando o pedido muda, para recarregar a lista.
 */
export default function ProducaoPedido({ idPedido, atualizarEm }) {
  const { podeAcessar } = useAuth()
  const {
    dados: apontamentos,
    carregando,
    erro,
  } = useCarregar(() => listarApontamentosDoPedido(idPedido), [idPedido, atualizarEm])

  const lista = apontamentos ?? []
  const minutosTotais = lista.reduce((s, a) => s + minutosEntre(a.inicio, a.fim), 0)
  const quantidadeTotal = lista.reduce((s, a) => s + (a.quantidade ?? 0), 0)
  const emAndamento = lista.filter((a) => a.emAndamento).length

  return (
    <section className="spv-card">
      <div className="spv-card-header">
        <i className="bi bi-stopwatch text-secondary" aria-hidden="true"></i>
        <h2>Produção</h2>
        {emAndamento > 0 && (
          <span className="badge text-bg-primary">{emAndamento} em andamento</span>
        )}
        {podeAcessar(TELAS.PRODUCAO) && (
          <Link to="/producao" className="small ms-auto">
            Abrir Produção
          </Link>
        )}
      </div>
      <div className="spv-card-body small">
        {carregando ? (
          <Carregando texto="Carregando produção..." />
        ) : erro ? (
          <span className="text-danger">{erro}</span>
        ) : lista.length === 0 ? (
          <span className="text-secondary">Nenhum apontamento de produção ainda.</span>
        ) : (
          <>
            <div className="d-flex gap-4 mb-2">
              <div>
                <div className="spv-dado-rotulo">Tempo total</div>
                <div className="fw-bold">{formatarDuracao(minutosTotais)}</div>
              </div>
              <div>
                <div className="spv-dado-rotulo">Produzido</div>
                <div className="fw-bold">{quantidadeTotal} un.</div>
              </div>
            </div>
            <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
              {lista.map((a) => (
                <li key={a.id} className="border-top pt-2">
                  <div className="d-flex justify-content-between gap-2">
                    <span className="fw-semibold">{a.operador}</span>
                    {a.emAndamento ? (
                      <span className="badge text-bg-primary">Em andamento</span>
                    ) : (
                      <span className="fw-semibold">{a.quantidade} un.</span>
                    )}
                  </div>
                  <div className="text-secondary">
                    {formatarDataHora(a.inicio)}
                    {a.fim ? ` → ${formatarDataHora(a.fim)}` : ' → agora'} ·{' '}
                    <span className="text-nowrap">
                      {formatarDuracao(minutosEntre(a.inicio, a.fim))}
                    </span>
                  </div>
                  {a.observacao && <div className="fst-italic">{a.observacao}</div>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
