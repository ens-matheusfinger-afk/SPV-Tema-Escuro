const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./usuariosModels');

const UsuarioTela = sequelize.define('UsuarioTela', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    tela: {
        type: DataTypes.STRING(100),
        allowNull: false
    },

    podeAcessar: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }

},
{
    tableName: 'usuarioTela',
    timestamps: false
});

Usuario.hasMany(UsuarioTela, { foreignKey: 'idUsuario' });
UsuarioTela.belongsTo(Usuario, { foreignKey: 'idUsuario' });

module.exports = UsuarioTela;