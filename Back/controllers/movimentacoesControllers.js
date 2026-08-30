const MovimentacoesModel = require('../models/movimentacoesModels');

exports.receber = async (req, res) => {
    try {
        const id = await MovimentacoesModel.receber(req.body);
        res.status(201).json({ message: "Movimentação de recebimento criada", id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.receberDesconto = async (req, res) => {
    try {
        const id = await MovimentacoesModel.receberDesconto(req.body);
        res.status(201).json({ message: "Recebimento com desconto registrado", id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.Pagar = async (req, res) => {
    try {
        const id = await MovimentacoesModel.Pagar(req.body);
        res.status(201).json({ message: "Movimentação de pagamento criada", id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listar = async (req, res) => {
    try {
        const lista = await MovimentacoesModel.listarTudo();
        res.json(lista);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};