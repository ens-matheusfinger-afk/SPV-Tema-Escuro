const crypto = require('crypto');
const Usuario = require('../models/usuariosModels');
const UsuarioTela = require('../models/usuarioTelaModels');

function gerarHashMD5(texto){
    return crypto.createHash('md5').update(texto).digest('hex');
}

async function listar(req,res){
    try{
        const usuarios = await Usuario.findAll({
            include: UsuarioTela,
            attributes: { exclude: ['senha'] }
        });
        res.json(usuarios);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function buscar(req,res){
    try{
        const usuario = await Usuario.findByPk(req.params.id, {
            include: UsuarioTela,
            attributes: { exclude: ['senha'] }
        });
        res.json(usuario);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function inserir(req,res){
    try{
        const usuario = await Usuario.create({
            login:req.body.login,
            senha:gerarHashMD5(req.body.senha),
            nome:req.body.nome,
            status:req.body.status
        });
        res.status(201).json(usuario);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function atualizar(req,res){
    try{
        const usuario = await Usuario.findByPk(req.params.id);

        const dados = {
            login:req.body.login,
            nome:req.body.nome,
            status:req.body.status
        };

        // só atualiza a senha se ela foi enviada
        if(req.body.senha){
            dados.senha = gerarHashMD5(req.body.senha);
        }

        await usuario.update(dados);

        res.json(usuario);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function excluir(req,res){
    try{
        const usuario = await Usuario.findByPk(req.params.id);
        await usuario.destroy();
        res.json({ mensagem:"Usuário removido." });
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