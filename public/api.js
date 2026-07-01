const API = '/api';

function getToken() {
  return localStorage.getItem('trilha_token');
}

function getUsuario() {
  const raw = localStorage.getItem('trilha_usuario');
  return raw ? JSON.parse(raw) : null;
}

function salvarSessao(token, usuario) {
  localStorage.setItem('trilha_token', token);
  localStorage.setItem('trilha_usuario', JSON.stringify(usuario));
}

function logout() {
  localStorage.removeItem('trilha_token');
  localStorage.removeItem('trilha_usuario');
  window.location.href = '/login.html';
}

// Garante que só usuário logado acesse a página. Chame no topo de páginas protegidas.
function exigirLogin() {
  if (!getToken()) {
    window.location.href = '/login.html';
  }
}

async function api(metodo, caminho, corpo) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers,
    body: corpo ? JSON.stringify(corpo) : undefined
  });

  if (resp.status === 401) {
    logout();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const texto = await resp.text();
  let dados;
  try {
    dados = texto ? JSON.parse(texto) : {};
  } catch {
    throw new Error('O servidor não respondeu corretamente. Verifique se ele está rodando (npm start) e se você está acessando via http://localhost:3000.');
  }

  if (!resp.ok) throw new Error(dados.erro || 'Erro na requisição');
  return dados;
}

function montarNavbar(paginaAtiva) {
  const usuario = getUsuario();
  const nav = document.getElementById('navbar');
  if (!nav) return;

  nav.innerHTML = `
    <div class="brand">
      <span class="brand-mark">●●●○○</span>
      <span class="brand-name">Trilha</span>
    </div>
    <nav class="nav-links">
      <a href="/index.html" class="${paginaAtiva === 'habitos' ? 'active' : ''}">Hábitos</a>
      <a href="/perfil.html" class="${paginaAtiva === 'perfil' ? 'active' : ''}">Perfil</a>
      <span class="nav-user">${usuario ? usuario.nome : ''}</span>
      <button id="btn-logout" class="btn btn-ghost btn-sm">Sair</button>
    </nav>
  `;
  document.getElementById('btn-logout').addEventListener('click', logout);
}

// ---------------------------------------------------------
// Modal de confirmação customizado (substitui o confirm() do navegador)
// Uso: const ok = await confirmarAcao('Excluir este hábito?'); if (!ok) return;
// ---------------------------------------------------------
function confirmarAcao(mensagem, opcoes = {}) {
  return new Promise((resolve) => {
    const titulo = opcoes.titulo || 'Confirmar ação';
    const textoConfirmar = opcoes.textoConfirmar || 'Excluir';
    const textoCancelar = opcoes.textoCancelar || 'Cancelar';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card">
        <h3 class="modal-titulo">${titulo}</h3>
        <p class="modal-mensagem">${mensagem}</p>
        <div class="modal-acoes">
          <button class="btn btn-ghost" data-acao="cancelar">${textoCancelar}</button>
          <button class="btn btn-danger-solid" data-acao="confirmar">${textoConfirmar}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function fechar(resultado) {
      overlay.remove();
      resolve(resultado);
    }

    overlay.querySelector('[data-acao="confirmar"]').addEventListener('click', () => fechar(true));
    overlay.querySelector('[data-acao="cancelar"]').addEventListener('click', () => fechar(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fechar(false);
    });
    document.addEventListener('keydown', function escListener(e) {
      if (e.key === 'Escape') {
        fechar(false);
        document.removeEventListener('keydown', escListener);
      }
    });
  });
}
