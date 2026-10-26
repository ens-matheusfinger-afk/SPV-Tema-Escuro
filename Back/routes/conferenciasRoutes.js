const express = require('express');
const controller = require('../controllers/conferenciasControllers');

// /pedidos/:id/conferencias  (mergeParams para enxergar o :id do pedido)
const router = express.Router({ mergeParams: true });
router.get('/', controller.listar);
router.post('/', controller.registrar);

module.exports = router;
