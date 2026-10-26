const { Op } = require('sequelize');
const Logs = require('../models/logsModels');
const { dataValida, falhar, responderErro } = require('../utils/financeiro');
const { intervaloDoDia } = require('../utils/caixa');

const MODULOS = ['acesso', 'pedidos', 'producao', 'financeiro', 'estoque', 'cadastros', 'sistema'];

/*
 * SPV-111 / REQ028 — consulta dos logs.
 * GET /logs?de=AAAA-MM-DD&ate=AAAA-MM-DD&modulo=&idUsuario=&busca=&entidade=&idEntidade=&limite=
 * Mais recentes primeiro; no máximo 1000 por consulta.
 */
exports.listar = async (req, res) => {
  try {
    const q = req.query;
    const where = {};
    if (q.de || q.ate) {
      const de = q.de || q.ate;
      const ate = q.ate || q.de;
      if (!dataValida(de) || !dataValida(ate)) falhar('Data inválida (use AAAA-MM-DD).');
      if (de > ate) falhar('A data inicial não pode ser depois da final.');
      where.dataHora = { [Op.between]: [intervaloDoDia(de).inicio, intervaloDoDia(ate).fim] };
    }
    if (q.modulo) {
      if (!MODULOS.includes(q.modulo)) falhar(`Módulo inválido. Use: ${MODULOS.join(', ')}.`);
      where.modulo = q.modulo;
    }
    if (q.idUsuario) where.idUsuario = Number(q.idUsuario);
    if (q.entidade) where.entidade = String(q.entidade);
    if (q.idEntidade) where.idEntidade = Number(q.idEntidade);
    if (q.busca) {
      const termo = `%${String(q.busca).trim()}%`;
      where[Op.or] = [{ descricao: { [Op.iLike]: termo } }, { usuarioNome: { [Op.iLike]: termo } }, { acao: { [Op.iLike]: termo } }];
    }
    const limite = Math.min(Math.max(Number(q.limite) || 500, 1), 1000);
    const { rows, count } = await Logs.findAndCountAll({ where, order: [['dataHora', 'DESC'], ['id', 'DESC']], limit: limite });
    res.json({ total: count, limite, logs: rows });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao consultar os logs.');
  }
};
