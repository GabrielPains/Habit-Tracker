function mostrarToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

function formatarData(dataISO) {
  if (!dataISO) return 'nunca';
  const [ano, mes, dia] = dataISO.split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
}

function preencherCabecalho() {
  const usuario = getUsuario();
  if (!usuario) return;
  document.getElementById('perfil-nome').textContent = usuario.nome;
  document.getElementById('perfil-email').textContent = usuario.email;
  document.getElementById('perfil-avatar').textContent = usuario.nome.charAt(0).toUpperCase();
  if (usuario.data_criacao) {
    document.getElementById('perfil-desde').textContent = `membro desde ${formatarData(usuario.data_criacao)}`;
  }
}

function renderizarResumo(stats) {
  const totalHabitos = stats.length;
  const totalRegistros = stats.reduce((soma, h) => soma + h.total_registros, 0);
  const totalConcluidos = stats.reduce((soma, h) => soma + h.total_concluidos, 0);
  const mediaGeral = totalRegistros > 0 ? Math.round((totalConcluidos / totalRegistros) * 100) : 0;

  const container = document.getElementById('stats-resumo');
  container.innerHTML = `
    <div class="stat-card">
      <span class="stat-valor">${totalHabitos}</span>
      <span class="stat-label">hábitos cadastrados</span>
    </div>
    <div class="stat-card">
      <span class="stat-valor">${totalRegistros}</span>
      <span class="stat-label">dias registrados</span>
    </div>
    <div class="stat-card">
      <span class="stat-valor">${totalConcluidos}</span>
      <span class="stat-label">dias concluídos</span>
    </div>
    <div class="stat-card stat-card-destaque">
      <span class="stat-valor">${mediaGeral}%</span>
      <span class="stat-label">taxa média de conclusão</span>
    </div>
  `;
}

function renderizarFrequencia(stats) {
  const container = document.getElementById('lista-frequencia');

  if (stats.length === 0) {
    container.innerHTML = '<p class="empty-state">Você ainda não tem hábitos cadastrados.</p>';
    return;
  }

  container.innerHTML = stats.map(h => {
    const percentual = Math.round(h.percentual_conclusao);
    return `
      <div class="freq-item">
        <div class="freq-header">
          <span class="freq-nome">${h.nome} <span class="tag">${h.categoria}</span></span>
          <span class="freq-percentual">${percentual}%</span>
        </div>
        <div class="freq-bar-bg">
          <div class="freq-bar-fill" style="width: ${percentual}%"></div>
        </div>
        <span class="freq-meta">
          ${h.total_concluidos} de ${h.total_registros} dia(s) registrado(s) · última conclusão: ${formatarData(h.ultima_data_concluida)}
        </span>
      </div>
    `;
  }).join('');
}

async function carregarPerfil() {
  preencherCabecalho();
  try {
    const stats = await api('GET', '/habitos/resumo/estatisticas');
    renderizarResumo(stats);
    renderizarFrequencia(stats);
  } catch (err) {
    mostrarToast(err.message);
  }
}

carregarPerfil();
