const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuarioTelaControllers');

router.get('/',controller.listar);
router.get('/:id',controller.buscar);
router.get('/usuario/:idUsuario',controller.listarPorUsuario);
router.post('/',controller.inserir);
router.put('/:id',controller.atualizar);
router.delete('/:id',controller.excluir);

module.exports = router;