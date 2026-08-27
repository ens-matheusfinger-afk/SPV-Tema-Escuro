const Usuario = require('../models/usuariosModel');

async function listar(req,res){

    try{

        const usuarios = await Usuario.findAll();

        res.json(usuarios);

    }catch(erro){

        res.status(500).json({erro:erro.message});

    }

}

async function buscar(req,res){

    try{

        const usuario = await Usuario.findByPk(req.params.id);

        res.json(usuario);

    }catch(erro){

        res.status(500).json({erro:erro.message});

    }

}

async function inserir(req,res){

    try{

        const usuario = await Usuario.create({

            login:req.body.login,
            senha:req.body.senha,
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

        await usuario.update({

            login:req.body.login,
            senha:req.body.senha,
            nome:req.body.nome,
            status:req.body.status

        });

        res.json(usuario);

    }catch(erro){

        res.status(500).json({erro:erro.message});

    }

}

async function excluir(req,res){

    try{

        const usuario = await Usuario.findByPk(req.params.id);

        await usuario.destroy();

        res.json({
            mensagem:"Usuário removido."
        });

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