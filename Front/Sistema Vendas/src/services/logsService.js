import api from './api'

/*
 * SPV-111 / REQ028 — registro de logs (quem fez o quê e quando).
 * O Back grava sozinho; aqui é só a consulta.
 */
export const MODULOS_LOG = {
  acesso: { nome: 'Acesso', icone: 'bi-door-open', cor: 'secondary' },
  pedidos: { nome: 'Pedidos', icone: 'bi-receipt', cor: 'primary' },
  producao: { nome: 'Produção', icone: 'bi-gear-wide-connected', cor: 'info' },
  financeiro: { nome: 'Financeiro', icone: 'bi-cash-coin', cor: 'success' },
  estoque: { nome: 'Estoque', icone: 'bi-box-seam', cor: 'warning' },
  cadastros: { nome: 'Cadastros', icone: 'bi-folder2-open', cor: 'dark' },
  sistema: { nome: 'Sistema', icone: 'bi-cpu', cor: 'light' },
}

// Ações que merecem destaque (tentativas de acesso negadas)
export const ACOES_ALERTA = ['login_falhou', 'login_bloqueado']

export async function listarLogs(filtros = {}) {
  const params = Object.fromEntries(
    Object.entries(filtros).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  )
  const { data } = await api.get('/logs', { params })
  return {
    total: Number(data.total),
    limite: Number(data.limite),
    logs: data.logs.map((l) => ({
      id: l.id,
      dataHora: l.dataHora,
      idUsuario: l.idUsuario,
      usuario: l.usuarioNome ?? '',
      modulo: l.modulo,
      acao: l.acao,
      descricao: l.descricao,
      entidade: l.entidade,
      idEntidade: l.idEntidade,
      ip: l.ip ?? '',
    })),
  }
}
