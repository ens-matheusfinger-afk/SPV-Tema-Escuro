const express = require('express');
const router = express.Router();
const controller = require('../controllers/logsControllers');

// SPV-111 / REQ028 — consulta do registro de logs (só leitura: log não se edita nem se apaga)
router.get('/', controller.listar);

module.exports = router;
