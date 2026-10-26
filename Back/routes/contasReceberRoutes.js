const express = require('express');
const router = express.Router();
const controller = require('../controllers/contasReceberControllers');

// SPV-85 — tela "Contas a receber"
router.get('/', controller.listar);
router.post('/', controller.cadastrar);
router.put('/:id', controller.editar);
router.get('/:id/encargos', controller.encargos); // SPV-73: prévia de multa e juros
router.post('/:id/receber', controller.receber);
router.post('/:id/estornar', controller.estornar);
router.delete('/:id', controller.excluir);

module.exports = router;
