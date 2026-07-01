const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const habitosRouter = require('./routes/habitos');
const registrosRouter = require('./routes/registros');
const authRouter = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRouter);
app.use('/api/habitos', habitosRouter);
app.use('/api/registros', registrosRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
