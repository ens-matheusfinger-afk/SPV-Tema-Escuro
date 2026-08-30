const express = require('express');
const router = express.Router();
const estoqueControllers = require('../controllers/estoqueControllers');

router.post('/', estoqueControllers.cadastrar);
router.get('/', estoqueControllers.listar);
router.get('/produto/:idProduto', estoqueControllers.buscarPorProduto);
router.put('/:id', estoqueControllers.editar);
router.post('/:id/entrada', estoqueControllers.entrada);
router.post('/:id/saida', estoqueControllers.saida);
router.delete('/:id', estoqueControllers.deletar);

module.exports = router;
