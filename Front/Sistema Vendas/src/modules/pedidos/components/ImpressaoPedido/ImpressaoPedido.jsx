import StatusBadge from '../../../../components/StatusBadge/StatusBadge'
import {
  formatarDataHora,
  formatarDia,
  formatarDocumento,
  formatarMoeda,
  formatarTelefone,
} from '../../../../utils/formatters'
import './ImpressaoPedido.css'

/*
 * Versão para imprimir (REQ008). Só aparece na impressão (classe spv-somente-impressao).
 * modo "a4": folha completa do pedido | modo "etiqueta": etiqueta 100 x 100 mm para identificar o pacote (SPV-69)
 */
export default function ImpressaoPedido({ pedido, cliente, modo }) {
  const pagina =
    modo === 'etiqueta'
      ? '@page { size: 100mm 100mm; margin: 3mm; }'
      : '@page { size: A4; margin: 15mm; }'

  return (
    <div className="spv-somente-impressao">
      <style>{pagina}</style>
      {modo === 'etiqueta' ? (
        <Etiqueta pedido={pedido} cliente={cliente} />
      ) : (
        <FolhaA4 pedido={pedido} cliente={cliente} />
      )}
    </div>
  )
}

// Quantos itens cabem listados na etiqueta 100 x 100 (o resto vira "+ N item(ns)")
const ITENS_NA_ETIQUETA = 5

function Etiqueta({ pedido, cliente }) {
  const unidades = pedido.itens.reduce((s, i) => s + i.quantidade, 0)
  const listados = pedido.itens.slice(0, ITENS_NA_ETIQUETA)
  const restantes = pedido.itens.length - listados.length

  return (
    <div className="spv-etiqueta">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="spv-etiqueta-marca">SYS VENDAS · PEDIDO</div>
          <div className="spv-etiqueta-numero">#{pedido.id}</div>
        </div>
        <div className="text-end">
          <div className="spv-etiqueta-marca">ENTREGA</div>
          <div className="spv-etiqueta-entrega">{formatarDia(pedido.dataEntregaPrevista)}</div>
        </div>
      </div>

      <div className="spv-etiqueta-bloco">
        <div className="spv-etiqueta-cliente">{cliente?.nome ?? `Cliente ${pedido.idCliente}`}</div>
        {cliente?.telefone && <div>{formatarTelefone(cliente.telefone)}</div>}
      </div>

      <div className="spv-etiqueta-bloco spv-etiqueta-itens">
        <div className="spv-etiqueta-marca mb-1">
          {pedido.itens.length} ITEM(NS) · {unidades} UNIDADE(S)
        </div>
        {listados.map((i) => (
          <div key={i.id} className="d-flex justify-content-between gap-2">
            <span className="text-truncate">{i.nome}</span>
            <strong>{i.quantidade}x</strong>
          </div>
        ))}
        {restantes > 0 && <div className="fst-italic">+ {restantes} item(ns)</div>}
      </div>

      {pedido.descricao && <div className="spv-etiqueta-obs">{pedido.descricao}</div>}
    </div>
  )
}

function FolhaA4({ pedido, cliente }) {
  return (
    <div className="spv-impressao-a4">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <div style={{ fontSize: '16pt', fontWeight: 800 }}>SYS VENDAS</div>
          <div>Sistema de Pedidos e Vendas</div>
        </div>
        <div className="text-end">
          <div style={{ fontSize: '18pt', fontWeight: 800 }}>Pedido nº {pedido.id}</div>
          <StatusBadge status={pedido.status} />
        </div>
      </div>

      <table className="mb-3">
        <tbody>
          <tr>
            <th style={{ width: '25%' }}>Cliente</th>
            <td>
              {cliente?.nome ?? `Cliente ${pedido.idCliente}`}
              {cliente?.documento && ` — ${formatarDocumento(cliente.documento)}`}
            </td>
          </tr>
          <tr>
            <th>Contato</th>
            <td>
              {[formatarTelefone(cliente?.telefone), cliente?.email].filter(Boolean).join(' · ') ||
                '—'}
            </td>
          </tr>
          <tr>
            <th>Vendedor</th>
            <td>{pedido.vendedor || '—'}</td>
          </tr>
          <tr>
            <th>Criado em</th>
            <td>{formatarDataHora(pedido.dataCriacao)}</td>
          </tr>
          <tr>
            <th>Entrega prevista</th>
            <td>{formatarDia(pedido.dataEntregaPrevista)}</td>
          </tr>
        </tbody>
      </table>

      <table className="mb-3">
        <thead>
          <tr>
            <th>Item</th>
            <th>Tipo</th>
            <th style={{ textAlign: 'right' }}>Qtd.</th>
            <th style={{ textAlign: 'right' }}>Valor unit.</th>
            <th style={{ textAlign: 'right' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {pedido.itens.map((i) => (
            <tr key={i.id}>
              <td>{i.nome}</td>
              <td>{i.tipoItem === 'produto' ? 'Produto' : 'Serviço'}</td>
              <td style={{ textAlign: 'right' }}>{i.quantidade}</td>
              <td style={{ textAlign: 'right' }}>{formatarMoeda(i.valorUnitario)}</td>
              <td style={{ textAlign: 'right' }}>{formatarMoeda(i.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {pedido.desconto && (
            <>
              <tr>
                <td colSpan={4} style={{ textAlign: 'right' }}>
                  Subtotal
                </td>
                <td style={{ textAlign: 'right' }}>{formatarMoeda(pedido.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={4} style={{ textAlign: 'right' }}>
                  Desconto
                  {pedido.desconto.tipo === 'percentual'
                    ? ` (${String(pedido.desconto.informado).replace('.', ',')}%)`
                    : ''}
                </td>
                <td style={{ textAlign: 'right' }}>− {formatarMoeda(pedido.desconto.valor)}</td>
              </tr>
            </>
          )}
          <tr>
            <th colSpan={4} style={{ textAlign: 'right' }}>
              Total
            </th>
            <th style={{ textAlign: 'right', fontSize: '13pt' }}>{formatarMoeda(pedido.total)}</th>
          </tr>
        </tfoot>
      </table>

      {pedido.descricao && (
        <p>
          <strong>Observações:</strong> {pedido.descricao}
        </p>
      )}

      <div className="d-flex gap-5 mt-5 pt-4">
        <div className="flex-fill text-center" style={{ borderTop: '1px solid #000' }}>
          Conferido por
        </div>
        <div className="flex-fill text-center" style={{ borderTop: '1px solid #000' }}>
          Retirado por (cliente)
        </div>
      </div>
    </div>
  )
}
