import { Link } from 'react-router-dom'
import { Button, Modal } from 'react-bootstrap'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import { useCarregar } from '../../hooks/useCarregar'
import { listarMovimentacoes, TIPOS_MOVIMENTACAO } from '../../services/estoqueService'
import { formatarDataHora } from '../../utils/formatters'

// Histórico de movimentações de um produto: quem mexeu, quanto, por quê e o saldo depois
export default function HistoricoEstoqueModal({ produto, podeVerPedidos, aoFechar }) {
  const { dados, carregando, erro, recarregar } = useCarregar(
    () => listarMovimentacoes(produto.estoque.id),
    [produto.estoque.id],
  )

  return (
    <Modal show onHide={aoFechar} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="h5">Histórico do estoque: {produto.nome}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        {erro && (
          <div className="p-3">
            <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />
          </div>
        )}
        {carregando ? (
          <Carregando texto="Carregando histórico..." />
        ) : dados?.length === 0 ? (
          <EstadoVazio icone="bi-clock-history" titulo="Nenhuma movimentação registrada." />
        ) : (
          dados && (
            <div className="table-responsive">
              <table className="table spv-tabela mb-0">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th className="text-end">Qtd.</th>
                    <th className="text-end">Saldo</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((m) => {
                    const t = TIPOS_MOVIMENTACAO[m.tipo]
                    return (
                      <tr key={m.id}>
                        <td className="text-nowrap small">
                          {formatarDataHora(m.data)}
                          {m.usuario && <div className="text-secondary">{m.usuario}</div>}
                        </td>
                        <td className="text-nowrap">
                          <span className={`badge rounded-pill text-bg-${t.cor} bg-opacity-75`}>
                            <i className={`bi ${t.icone} me-1`} aria-hidden="true"></i>
                            {t.nome}
                          </span>
                        </td>
                        <td
                          className={`text-end fw-semibold ${m.quantidade > 0 ? 'text-success' : 'text-danger'}`}
                        >
                          {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade}
                        </td>
                        <td className="text-end text-nowrap small">
                          {m.saldoAnterior} → <strong>{m.saldoAtual}</strong>
                        </td>
                        <td className="small">
                          {m.motivo || '—'}
                          {m.idPedido && podeVerPedidos && (
                            <div>
                              <Link to={`/pedidos/${m.idPedido}`} onClick={aoFechar}>
                                Ver pedido nº {m.idPedido}
                              </Link>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" className="border" onClick={aoFechar}>
          Fechar
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
