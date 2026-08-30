const ClienteCNPJ = require('../models/clientesCNPJModels');

async function listar(req,res){
    try{
        const registros = await ClienteCNPJ.findAll();
        res.json(registros);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function buscar(req,res){
    try{
        const registro = await ClienteCNPJ.findByPk(req.params.id);
        res.json(registro);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function inserir(req,res){
    try{
        const registro = await ClienteCNPJ.create({
            idCliente:req.body.idCliente,
            cnpj:req.body.cnpj,
            nomeFantasia:req.body.nomeFantasia
        });
        res.status(201).json(registro);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function atualizar(req,res){
    try{
        const registro = await ClienteCNPJ.findByPk(req.params.id);
        await registro.update({
            idCliente:req.body.idCliente,
            cnpj:req.body.cnpj,
            nomeFantasia:req.body.nomeFantasia
        });
        res.json(registro);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function excluir(req,res){
    try{
        const registro = await ClienteCNPJ.findByPk(req.params.id);
        await registro.destroy();
        res.json({ mensagem:"Registro CNPJ removido." });
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

module.exports = {
    listar,
    buscar,
    inserir,
    atualizar,
    excluir
};