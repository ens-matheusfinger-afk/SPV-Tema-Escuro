const UsuarioTela = require('../models/usuarioTelaModels');

async function listar(req,res){
    try{
        const registros = await UsuarioTela.findAll();
        res.json(registros);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function buscar(req,res){
    try{
        const registro = await UsuarioTela.findByPk(req.params.id);
        res.json(registro);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function listarPorUsuario(req,res){
    try{
        const registros = await UsuarioTela.findAll({
            where:{ idUsuario:req.params.idUsuario }
        });
        res.json(registros);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function inserir(req,res){
    try{
        const registro = await UsuarioTela.create({
            idUsuario:req.body.idUsuario,
            tela:req.body.tela,
            podeAcessar:req.body.podeAcessar
        });
        res.status(201).json(registro);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function atualizar(req,res){
    try{
        const registro = await UsuarioTela.findByPk(req.params.id);
        await registro.update({
            idUsuario:req.body.idUsuario,
            tela:req.body.tela,
            podeAcessar:req.body.podeAcessar
        });
        res.json(registro);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function excluir(req,res){
    try{
        const registro = await UsuarioTela.findByPk(req.params.id);
        await registro.destroy();
        res.json({ mensagem:"Permissão removida." });
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

module.exports = {
    listar,
    buscar,
    listarPorUsuario,
    inserir,
    atualizar,
    excluir
};