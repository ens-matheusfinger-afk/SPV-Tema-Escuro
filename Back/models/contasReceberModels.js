const db = require('../config/db');

class ContasReceberModel {
    static async pago(dados) {
        const { idPedido, total, dataPrevisao } = dados;
        const [result] = await db.query(
            `INSERT INTO contasReceber (idPedido, total, dataPrevisao) VALUES (?, ?, ?)`,
            [idPedido, total, dataPrevisao]
        );
        return result.insertId;
    }

    static async adiantar(id, dados) {
        const { total, dataPrevisao } = dados;
        await db.query(
            `UPDATE contasReceber SET total = ?, dataPrevisao = ? WHERE id = ?`,
            [total, dataPrevisao, id]
        );
    }

    static async cancela(id) {
        await db.query(`DELETE FROM contasReceber WHERE id = ?`, [id]);
    }

    static async listarTudo() {
        const [rows] = await db.query(`SELECT * FROM contasReceber`);
        return rows;
    }
}

module.exports = ContasReceberModel;