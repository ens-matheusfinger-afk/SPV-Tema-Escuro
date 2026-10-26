const express = require('express');
const router = express.Router();
const controller = require('../controllers/contasPagarControllers');

// SPV-86/98 — tela "Contas a pagar"
router.get('/', controller.listar);
router.post('/', controller.cadastrar);
router.put('/:id', controller.editar);
router.post('/:id/pagar', controller.pagar);
router.post('/:id/estornar', controller.estornar);
router.delete('/:id', controller.excluir);

module.exports = router;
