const express = require('express');
const router = express.Router();
const controller = require('../controllers/contasPagarControllers');

router.post('/criar', controller.criarPendencia);
router.put('/editar/:id', controller.editarPendencia);
router.put('/cancelar/:id', controller.cancelarPendencia);
router.delete('/excluir/:id', controller.excluirPendencia);
router.get('/', controller.listar);

module.exports = router;