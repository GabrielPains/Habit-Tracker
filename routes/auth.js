const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../db');
const autenticar = require('../middleware/auth');
require('dotenv').config();

// post de cadastro
router.post('/cadastro', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ erro: 'A senha deve ter no mínimo 6 caracteres' });
    }

    const pool = await getPool();

    const existente = await pool.request()
      .input('email', sql.NVarChar, email.toLowerCase())
      .query('SELECT id FROM Usuario WHERE email = @email');

    if (existente.recordset.length > 0) {
      return res.status(409).json({ erro: 'Já existe uma conta com esse email' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const result = await pool.request()
      .input('nome', sql.NVarChar, nome)
      .input('email', sql.NVarChar, email.toLowerCase())
      .input('senha_hash', sql.NVarChar, senhaHash)
      .query(`
        INSERT INTO Usuario (nome, email, senha_hash)
        OUTPUT INSERTED.id, INSERTED.nome, INSERTED.email, INSERTED.data_criacao
        VALUES (@nome, @email, @senha_hash)
      `);

    const usuario = result.recordset[0];
    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, usuario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar conta', detalhe: err.message });
  }
});

// Post de login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, email.toLowerCase())
      .query('SELECT * FROM Usuario WHERE email = @email');

    const usuario = result.recordset[0];
    if (!usuario) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, data_criacao: usuario.data_criacao }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao fazer login', detalhe: err.message });
  }
});

// porem  nao estou usando, o token salva no localhost, e eu uso o localhost
// get me. retorna o usuário logado a partir do token
// router.get('/me', autenticar, async (req, res) => {
//   try {
//     const pool = await getPool();
//     const result = await pool.request()
//       .input('id', sql.Int, req.usuarioId)
//       .query('SELECT id, nome, email, data_criacao FROM Usuario WHERE id = @id');

//     if (result.recordset.length === 0) {
//       return res.status(404).json({ erro: 'Usuário não encontrado' });
//     }
//     res.json(result.recordset[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ erro: 'Erro ao buscar usuário', detalhe: err.message });
//   }
// });

module.exports = router;
