const jwt = require('jsonwebtoken');
require('dotenv').config();

function autenticar(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não informado. Faça login novamente.' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado. Faça login novamente.' });
  }
}

module.exports = autenticar;
