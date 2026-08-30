const Cliente = require('../models/clientesModels');
const ClienteCPF = require('../models/clientesCPFModels');
const ClienteCNPJ = require('../models/clientesCNPJModels');

async function listar(req,res){
    try{
        const clientes = await Cliente.findAll({ include: [ClienteCPF, ClienteCNPJ] });
        res.json(clientes);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function buscar(req,res){
    try{
        const cliente = await Cliente.findByPk(req.params.id, { include: [ClienteCPF, ClienteCNPJ] });
        res.json(cliente);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function inserir(req,res){
    try{
        const cliente = await Cliente.create({
            nome:req.body.nome,
            telefone:req.body.telefone,
            email:req.body.email,
            status:req.body.status
        });
        res.status(201).json(cliente);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function atualizar(req,res){
    try{
        const cliente = await Cliente.findByPk(req.params.id);
        await cliente.update({
            nome:req.body.nome,
            telefone:req.body.telefone,
            email:req.body.email,
            status:req.body.status
        });
        res.json(cliente);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function excluir(req,res){
    try{
        const cliente = await Cliente.findByPk(req.params.id);
        await cliente.destroy();
        res.json({ mensagem:"Cliente removido." });
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
