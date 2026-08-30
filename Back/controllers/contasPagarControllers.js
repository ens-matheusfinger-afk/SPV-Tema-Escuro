const ContasPagarModel = require('../models/contasPagarModels');

exports.criarPendencia = async (req, res) => {
    try {
        const id = await ContasPagarModel.criarPendencia(req.body);
        res.status(201).json({ message: "Pendência criada com sucesso", id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.editarPendencia = async (req, res) => {
    try {
        await ContasPagarModel.editarPendencia(req.params.id, req.body);
        res.json({ message: "Pendência atualizada com sucesso" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.cancelarPendencia = async (req, res) => {
    try {
        await ContasPagarModel.excluirPendencia(req.params.id);
        res.json({ message: "Pendência cancelada com sucesso" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.excluirPendencia = async (req, res) => {
    try {
        await ContasPagarModel.excluirPendencia(req.params.id);
        res.json({ message: "Pendência excluída com sucesso" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listar = async (req, res) => {
    try {
        const lista = await ContasPagarModel.listarTudo();
        res.json(lista);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};