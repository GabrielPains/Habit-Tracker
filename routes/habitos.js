const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');
const autenticar = require('../middleware/auth');

// todas as rotas de hábitos exigem login
router.use(autenticar);

// ---------------------------------------------------------
// GET /api/habitos
// Atende DBE2: paginação, filtros e ordenação
// Sempre restrito ao usuário logado (req.usuarioId)
// ---------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const categoria = req.query.categoria || null;
    const ativo = req.query.ativo; // 'true' | 'false' | undefined

    const colunasPermitidas = ['nome', 'categoria', 'data_criacao'];
    const ordenar = colunasPermitidas.includes(req.query.ordenar) ? req.query.ordenar : 'data_criacao';
    const direcao = req.query.direcao === 'asc' ? 'ASC' : 'DESC';

    const pool = await getPool();
    const request = pool.request();

    let whereClauses = ['usuario_id = @usuarioId'];
    request.input('usuarioId', sql.Int, req.usuarioId);

    if (categoria) {
      whereClauses.push('categoria = @categoria');
      request.input('categoria', sql.NVarChar, categoria);
    }
    if (ativo === 'true' || ativo === 'false') {
      whereClauses.push('ativo = @ativo');
      request.input('ativo', sql.Bit, ativo === 'true' ? 1 : 0);
    }
    const where = `WHERE ${whereClauses.join(' AND ')}`;

    request.input('offset', sql.Int, offset);
    request.input('pageSize', sql.Int, pageSize);

    const result = await request.query(`
      SELECT id, nome, descricao, categoria, frequencia, ativo, data_criacao
      FROM Habito
      ${where}
      ORDER BY ${ordenar} ${direcao}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    `);

    const totalRequest = pool.request();
    totalRequest.input('usuarioId', sql.Int, req.usuarioId);
    if (categoria) totalRequest.input('categoria', sql.NVarChar, categoria);
    if (ativo === 'true' || ativo === 'false') totalRequest.input('ativo', sql.Bit, ativo === 'true' ? 1 : 0);
    const totalResult = await totalRequest.query(`SELECT COUNT(*) AS total FROM Habito ${where};`);

    const total = totalResult.recordset[0].total;

    res.json({
      data: result.recordset,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar hábitos', detalhe: err.message });
  }
});

// GET /api/habitos/resumo/estatisticas
// (ATENÇÃO: precisa vir antes de "/:id" para não ser interpretado como um id)
router.get('/resumo/estatisticas', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('usuarioId', sql.Int, req.usuarioId)
      .query(`
        SELECT
          h.id,
          h.nome,
          h.categoria,
          h.frequencia,
          COUNT(r.id) AS total_registros,
          SUM(CASE WHEN r.concluido = 1 THEN 1 ELSE 0 END) AS total_concluidos,
          CASE WHEN COUNT(r.id) = 0 THEN 0
               ELSE CAST(SUM(CASE WHEN r.concluido = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(r.id) * 100
          END AS percentual_conclusao,
          MAX(CASE WHEN r.concluido = 1 THEN r.data ELSE NULL END) AS ultima_data_concluida
        FROM Habito h
        LEFT JOIN RegistroHabito r ON r.habito_id = h.id
        WHERE h.usuario_id = @usuarioId
        GROUP BY h.id, h.nome, h.categoria, h.frequencia
        ORDER BY percentual_conclusao DESC;
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar estatísticas', detalhe: err.message });
  }
});

// GET /api/habitos/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('usuarioId', sql.Int, req.usuarioId)
      .query('SELECT * FROM Habito WHERE id = @id AND usuario_id = @usuarioId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ erro: 'Hábito não encontrado' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar hábito', detalhe: err.message });
  }
});

// ---------------------------------------------------------
// POST /api/habitos -> Inclusão (BD2)
// ---------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { nome, descricao, categoria, frequencia } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ erro: 'O campo "nome" é obrigatório' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('usuarioId', sql.Int, req.usuarioId)
      .input('nome', sql.NVarChar, nome)
      .input('descricao', sql.NVarChar, descricao || null)
      .input('categoria', sql.NVarChar, categoria || 'geral')
      .input('frequencia', sql.NVarChar, frequencia || 'diario')
      .query(`
        INSERT INTO Habito (usuario_id, nome, descricao, categoria, frequencia)
        OUTPUT INSERTED.*
        VALUES (@usuarioId, @nome, @descricao, @categoria, @frequencia)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar hábito', detalhe: err.message });
  }
});

// ---------------------------------------------------------
// PUT /api/habitos/:id -> Alteração (BD2)
// ---------------------------------------------------------
router.put('/:id', async (req, res) => {
  try {
    const { nome, descricao, categoria, frequencia, ativo } = req.body;
    const pool = await getPool();

    const existe = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('usuarioId', sql.Int, req.usuarioId)
      .query('SELECT id FROM Habito WHERE id = @id AND usuario_id = @usuarioId');

    if (existe.recordset.length === 0) {
      return res.status(404).json({ erro: 'Hábito não encontrado' });
    }

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('usuarioId', sql.Int, req.usuarioId)
      .input('nome', sql.NVarChar, nome)
      .input('descricao', sql.NVarChar, descricao || null)
      .input('categoria', sql.NVarChar, categoria || 'geral')
      .input('frequencia', sql.NVarChar, frequencia || 'diario')
      .input('ativo', sql.Bit, ativo === undefined ? 1 : ativo)
      .query(`
        UPDATE Habito
        SET nome = @nome,
            descricao = @descricao,
            categoria = @categoria,
            frequencia = @frequencia,
            ativo = @ativo
        OUTPUT INSERTED.*
        WHERE id = @id AND usuario_id = @usuarioId
      `);

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar hábito', detalhe: err.message });
  }
});

// ---------------------------------------------------------
// DELETE /api/habitos/:id -> Exclusão (BD2)
// ---------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('usuarioId', sql.Int, req.usuarioId)
      .query('DELETE FROM Habito OUTPUT DELETED.id WHERE id = @id AND usuario_id = @usuarioId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ erro: 'Hábito não encontrado' });
    }
    res.json({ mensagem: 'Hábito excluído com sucesso', id: result.recordset[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir hábito', detalhe: err.message });
  }
});

module.exports = router;
