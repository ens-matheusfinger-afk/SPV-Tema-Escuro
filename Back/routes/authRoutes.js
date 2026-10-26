const express = require('express');
const router = express.Router();
const controller = require('../controllers/authControllers');

router.post('/',controller.entrar);
router.post('/sair',controller.sair); // SPV-111: registra a saída

module.exports = router;
