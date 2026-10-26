import api from './api'

/*
 * SPV-58 — pendências por cliente.
 * Os números vêm prontos da VIEW vw_pendencias_clientes do banco, pela rota GET /pendencias
 * (Front -> API -> Sequelize -> View). O Front só mostra, filtra e exporta.
 */
export const ORIGEM_PENDENCIAS = 'vw_pendencias_clientes'

function montarPendencia(p) {
  return {
    cliente: {
      id: p.idCliente,
      nome: p.nome,
      telefone: p.telefone ?? '',
      fatorConfianca: Number(p.fatorConfianca ?? 3),
      ativo: Boolean(p.clienteAtivo),
    },
    vencido: Number(p.valorVencido),
    contasVencidas: Number(p.contasVencidas),
    aReceber: Number(p.valorAReceber),
    idsProntos: p.idsPedidosProntos ?? [],
    emAndamento: Number(p.pedidosEmAndamento),
    inadimplente: Boolean(p.inadimplente),
  }
}

export async function listarPendencias() {
  const { data } = await api.get('/pendencias')
  return data.map(montarPendencia)
}
