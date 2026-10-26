const { Op } = require('sequelize');
const PendenciasClientes = require('../models/pendenciasClientesModels');

const FILTROS = {
  devendo: { inadimplente: true },
  receber: { valorAReceber: { [Op.gt]: 0 } },
  retirada: { pedidosProntos: { [Op.gt]: 0 } },
};

// GET /pendencias?filtro=devendo|receber|retirada
// SPV-58: lê a VIEW vw_pendencias_clientes (quem deve mais aparece primeiro)
exports.listar = async (req, res) => {
  try {
    const { filtro } = req.query;
    if (filtro && !FILTROS[filtro]) {
      return res.status(400).json({ erro: 'Filtro inválido: use devendo, receber ou retirada.' });
    }
    const pendencias = await PendenciasClientes.findAll({
      where: filtro ? FILTROS[filtro] : undefined,
      order: [
        ['valorVencido', 'DESC'],
        ['valorAReceber', 'DESC'],
        ['nome', 'ASC'],
      ],
    });
    return res.status(200).json(pendencias);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao consultar pendências por cliente.', detalhes: error.message });
  }
};
