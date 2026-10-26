const express = require('express');
const controller = require('../controllers/apontamentosControllers');

// /pedidos/:id/apontamentos  (mergeParams para enxergar o :id do pedido)
const doPedido = express.Router({ mergeParams: true });
doPedido.get('/', controller.listarPorPedido);
doPedido.post('/', controller.iniciar);

// /apontamentos
const avulso = express.Router();
avulso.get('/', controller.listar);
avulso.put('/:id/concluir', controller.concluir);
avulso.delete('/:id', controller.cancelar);

module.exports = { doPedido, avulso };
