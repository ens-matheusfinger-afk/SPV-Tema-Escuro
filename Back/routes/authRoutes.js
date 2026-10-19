const express = require('express');
const router = express.Router();
const controller = require('../controllers/authControllers');

router.post('/',controller.entrar);

module.exports = router;
