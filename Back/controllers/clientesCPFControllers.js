const ClienteCPF = require('../models/clientesCPFModel');

async function listar(req,res){
    try{
        const registros = await ClienteCPF.findAll();
        res.json(registros);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function buscar(req,res){
    try{
        const registro = await ClienteCPF.findByPk(req.params.id);
        res.json(registro);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function inserir(req,res){
    try{
        const registro = await ClienteCPF.create({
            idCliente:req.body.idCliente,
            cpf:req.body.cpf
        });
        res.status(201).json(registro);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function atualizar(req,res){
    try{
        const registro = await ClienteCPF.findByPk(req.params.id);
        await registro.update({
            idCliente:req.body.idCliente,
            cpf:req.body.cpf
        });
        res.json(registro);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function excluir(req,res){
    try{
        const registro = await ClienteCPF.findByPk(req.params.id);
        await registro.destroy();
        res.json({ mensagem:"Registro CPF removido." });
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