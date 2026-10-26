const express = require('express');
const controller = require('../controllers/anexosControllers');

// /pedidos/:id/anexos  (mergeParams para enxergar o :id do pedido)
const doPedido = express.Router({ mergeParams: true });
doPedido.get('/', controller.listar);
doPedido.post('/', controller.enviar);

// /anexos/:id
const avulso = express.Router();
avulso.get('/:id/arquivo', controller.arquivo);
avulso.delete('/:id', controller.remover);

module.exports = { doPedido, avulso };
