const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');
const autenticar = require('../middleware/auth');

router.use(autenticar);

// ---------------------------------------------------------
// GET /api/registros?habitoId=1&dataInicio=2026-06-01&dataFim=2026-06-30&page=1&pageSize=10
// Atende DBE2: paginação + filtro por período + ordenação por data
// Sempre restrito aos hábitos do usuário logado
// ---------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const habitoId = req.query.habitoId || null;
    const dataInicio = req.query.dataInicio || null;
    const dataFim = req.query.dataFim || null;
    const direcao = req.query.direcao === 'asc' ? 'ASC' : 'DESC';

    const pool = await getPool();
    const request = pool.request();

    let where = ['h.usuario_id = @usuarioId'];
    request.input('usuarioId', sql.Int, req.usuarioId);

    if (habitoId) {
      where.push('r.habito_id = @habitoId');
      request.input('habitoId', sql.Int, habitoId);
    }
    if (dataInicio) {
      where.push('r.data >= @dataInicio');
      request.input('dataInicio', sql.Date, dataInicio);
    }
    if (dataFim) {
      where.push('r.data <= @dataFim');
      request.input('dataFim', sql.Date, dataFim);
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;

    request.input('offset', sql.Int, offset);
    request.input('pageSize', sql.Int, pageSize);

    const result = await request.query(`
      SELECT r.id, r.habito_id, h.nome AS habito_nome, r.data, r.concluido, r.observacao
      FROM RegistroHabito r
      INNER JOIN Habito h ON h.id = r.habito_id
      ${whereSql}
      ORDER BY r.data ${direcao}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    `);

    const totalRequest = pool.request();
    totalRequest.input('usuarioId', sql.Int, req.usuarioId);
    if (habitoId) totalRequest.input('habitoId', sql.Int, habitoId);
    if (dataInicio) totalRequest.input('dataInicio', sql.Date, dataInicio);
    if (dataFim) totalRequest.input('dataFim', sql.Date, dataFim);
    const totalResult = await totalRequest.query(`
      SELECT COUNT(*) AS total
      FROM RegistroHabito r
      INNER JOIN Habito h ON h.id = r.habito_id
      ${whereSql};
    `);

    res.json({
      data: result.recordset,
      pagination: {
        page,
        pageSize,
        total: totalResult.recordset[0].total,
        totalPages: Math.ceil(totalResult.recordset[0].total / pageSize)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar registros', detalhe: err.message });
  }
});

// ---------------------------------------------------------
// POST /api/registros -> marca um hábito como feito/não feito em uma data
// Verifica antes que o hábito pertence ao usuário logado
// ---------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { habito_id, data, concluido, observacao } = req.body;

    if (!habito_id || !data) {
      return res.status(400).json({ erro: 'Os campos "habito_id" e "data" são obrigatórios' });
    }

    const pool = await getPool();

    const habito = await pool.request()
      .input('id', sql.Int, habito_id)
      .input('usuarioId', sql.Int, req.usuarioId)
      .query('SELECT id FROM Habito WHERE id = @id AND usuario_id = @usuarioId');

    if (habito.recordset.length === 0) {
      return res.status(404).json({ erro: 'Hábito não encontrado' });
    }

    const result = await pool.request()
      .input('habito_id', sql.Int, habito_id)
      .input('data', sql.Date, data)
      .input('concluido', sql.Bit, concluido ? 1 : 0)
      .input('observacao', sql.NVarChar, observacao || null)
      .query(`
        MERGE RegistroHabito AS target
        USING (SELECT @habito_id AS habito_id, @data AS data) AS source
        ON target.habito_id = source.habito_id AND target.data = source.data
        WHEN MATCHED THEN
          UPDATE SET concluido = @concluido, observacao = @observacao
        WHEN NOT MATCHED THEN
          INSERT (habito_id, data, concluido, observacao)
          VALUES (@habito_id, @data, @concluido, @observacao)
        OUTPUT INSERTED.*;
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao registrar hábito', detalhe: err.message });
  }
});

// PUT /api/registros/:id -> Alteração (BD2)
router.put('/:id', async (req, res) => {
  try {
    const { concluido, observacao } = req.body;
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('usuarioId', sql.Int, req.usuarioId)
      .input('concluido', sql.Bit, concluido ? 1 : 0)
      .input('observacao', sql.NVarChar, observacao || null)
      .query(`
        UPDATE r
        SET r.concluido = @concluido, r.observacao = @observacao
        OUTPUT INSERTED.*
        FROM RegistroHabito r
        INNER JOIN Habito h ON h.id = r.habito_id
        WHERE r.id = @id AND h.usuario_id = @usuarioId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ erro: 'Registro não encontrado' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar registro', detalhe: err.message });
  }
});

// DELETE /api/registros/:id -> Exclusão (BD2)
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('usuarioId', sql.Int, req.usuarioId)
      .query(`
        DELETE r
        OUTPUT DELETED.id
        FROM RegistroHabito r
        INNER JOIN Habito h ON h.id = r.habito_id
        WHERE r.id = @id AND h.usuario_id = @usuarioId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ erro: 'Registro não encontrado' });
    }
    res.json({ mensagem: 'Registro excluído com sucesso', id: result.recordset[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir registro', detalhe: err.message });
  }
});

module.exports = router;
