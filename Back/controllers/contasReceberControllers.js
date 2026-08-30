const ContasReceberModel = require('../models/contasReceberModels');

exports.pago = async (req, res) => {
    try {
        const id = await ContasReceberModel.pago(req.body);
        res.status(201).json({ message: "Conta paga/recebida com sucesso", id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.cancela = async (req, res) => {
    try {
        await ContasReceberModel.cancela(req.params.id);
        res.json({ message: "Conta a receber cancelada com sucesso" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.adiantar = async (req, res) => {
    try {
        await ContasReceberModel.adiantar(req.params.id, req.body);
        res.json({ message: "Adiantamento registrado com sucesso" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listar = async (req, res) => {
    try {
        const lista = await ContasReceberModel.listarTudo();
        res.json(lista);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};