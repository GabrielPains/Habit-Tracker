
let paginaHabitos = 1;
let paginaHistorico = 1;
const TAMANHO_PAGINA = 5;

// utilidade
function mostrarToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

function formatarData(dataISO) {
  const [ano, mes, dia] = dataISO.split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
}

// a função api() usada abaixo vem de api.js (já injeta o token de login)
// lista de habitos
async function carregarHabitos() {
  const categoria = document.getElementById('filtro-categoria').value;
  const ordenar = document.getElementById('ordenar').value;
  const direcao = document.getElementById('direcao').value;

// paginaçao
  const params = new URLSearchParams({
    page: paginaHabitos,
    pageSize: TAMANHO_PAGINA,
    ordenar,
    direcao
  });
  if (categoria) params.set('categoria', categoria);

  try {
    const { data, pagination } = await api('GET', `/habitos?${params.toString()}`);
    renderizarHabitos(data);
    document.getElementById('pag-info').textContent =
      `página ${pagination.page} de ${pagination.totalPages || 1} · ${pagination.total} hábito(s)`;
    document.getElementById('pag-anterior').disabled = pagination.page <= 1;
    document.getElementById('pag-proxima').disabled = pagination.page >= pagination.totalPages;
    await preencherSelectHabitos();
  } catch (err) {
    mostrarToast(err.message);
  }
}

function renderizarHabitos(habitos) {
  const lista = document.getElementById('lista-habitos');
  lista.innerHTML = '';

  if (habitos.length === 0) {
    lista.innerHTML = '<p class="empty-state">Nenhum hábito encontrado. Crie o primeiro acima.</p>';
    return;
  }

  habitos.forEach(h => {
    const card = document.createElement('div');
    card.className = `habit-card ${h.ativo ? '' : 'inativo'}`;
    card.innerHTML = `
      <div class="habit-info">
        <span class="habit-nome">${h.nome} <span class="tag">${h.categoria}</span></span>
        ${h.descricao ? `<span class="habit-desc">${h.descricao}</span>` : ''}
        <span class="habit-meta">${h.frequencia} · criado em ${formatarData(h.data_criacao)}</span>
      </div>
      <div class="habit-actions">
        <button class="btn btn-ghost" data-acao="editar" data-id="${h.id}">Editar</button>
        <button class="btn btn-danger" data-acao="excluir" data-id="${h.id}">Excluir</button>
      </div>
    `;
    lista.appendChild(card);
  });

  lista.querySelectorAll('[data-acao="editar"]').forEach(btn =>
    btn.addEventListener('click', () => editarHabito(btn.dataset.id, habitos))
  );
  lista.querySelectorAll('[data-acao="excluir"]').forEach(btn =>
    btn.addEventListener('click', () => excluirHabito(btn.dataset.id))
  );
}

// editar habitos e criar 
function editarHabito(id, habitosAtuais) {
  const h = habitosAtuais.find(x => String(x.id) === String(id));
  if (!h) return;
  document.getElementById('habito-id').value = h.id;
  document.getElementById('nome').value = h.nome;
  document.getElementById('descricao').value = h.descricao || '';
  document.getElementById('categoria').value = h.categoria;
  document.getElementById('frequencia').value = h.frequencia;
  document.getElementById('btn-salvar').textContent = 'Atualizar hábito';
  document.getElementById('btn-cancelar').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limparFormHabito() {
  document.getElementById('habito-id').value = '';
  document.getElementById('form-habito').reset();
  document.getElementById('btn-salvar').textContent = 'Salvar hábito';
  document.getElementById('btn-cancelar').classList.add('hidden');
}

async function salvarHabito(e) {
  e.preventDefault();
  const id = document.getElementById('habito-id').value;
  const corpo = {
    nome: document.getElementById('nome').value.trim(),
    descricao: document.getElementById('descricao').value.trim(),
    categoria: document.getElementById('categoria').value,
    frequencia: document.getElementById('frequencia').value
  };

  try {
    if (id) {
      await api('PUT', `/habitos/${id}`, corpo);
      mostrarToast('Hábito atualizado');
    } else {
      await api('POST', '/habitos', corpo);
      mostrarToast('Hábito criado');
    }
    limparFormHabito();
    paginaHabitos = 1;
    carregarHabitos();
  } catch (err) {
    mostrarToast(err.message);
  }
}

//exluir habitos
async function excluirHabito(id) {
  const ok = await confirmarAcao('Excluir este hábito e todo o seu histórico? Essa ação não pode ser desfeita.');
  if (!ok) return;
  try {
    await api('DELETE', `/habitos/${id}`);
    mostrarToast('Hábito excluído');
    carregarHabitos();
  } catch (err) {
    mostrarToast(err.message);
  }
}

// ---------------- selects dependentes ----------------
async function preencherSelectHabitos() {
  try {
    const { data } = await api('GET', '/habitos?pageSize=100');
    const selectRegistro = document.getElementById('registro-habito');
    const selectHistorico = document.getElementById('hist-habito');

    const valorAtualRegistro = selectRegistro.value;
    const valorAtualHistorico = selectHistorico.value;

    selectRegistro.innerHTML = data.map(h => `<option value="${h.id}">${h.nome}</option>`).join('');
    selectHistorico.innerHTML = '<option value="">Todos os hábitos</option>' +
      data.map(h => `<option value="${h.id}">${h.nome}</option>`).join('');

    if (valorAtualRegistro) selectRegistro.value = valorAtualRegistro;
    if (valorAtualHistorico) selectHistorico.value = valorAtualHistorico;
  } catch (err) {
    console.error(err);
  }
}

// criar registros
async function salvarRegistro(e) {
  e.preventDefault();
  const corpo = {
    habito_id: document.getElementById('registro-habito').value,
    data: document.getElementById('registro-data').value,
    concluido: document.getElementById('registro-concluido').checked,
    observacao: document.getElementById('registro-obs').value.trim()
  };
  try {
    await api('POST', '/registros', corpo);
    mostrarToast('Registro salvo');
    document.getElementById('form-registro').reset();
    document.getElementById('registro-data').value = new Date().toISOString().split('T')[0];
    paginaHistorico = 1;
    carregarHistorico();
  } catch (err) {
    mostrarToast(err.message);
  }
}

// historico de registros, carregar eles
async function carregarHistorico() {
  const habitoId = document.getElementById('hist-habito').value;
  const dataInicio = document.getElementById('hist-inicio').value;
  const dataFim = document.getElementById('hist-fim').value;

  const params = new URLSearchParams({ page: paginaHistorico, pageSize: TAMANHO_PAGINA });
  if (habitoId) params.set('habitoId', habitoId);
  if (dataInicio) params.set('dataInicio', dataInicio);
  if (dataFim) params.set('dataFim', dataFim);

  try {
    const { data, pagination } = await api('GET', `/registros?${params.toString()}`);
    renderizarHistorico(data);
    document.getElementById('hist-info').textContent =
      `página ${pagination.page} de ${pagination.totalPages || 1} · ${pagination.total} registro(s)`;
    document.getElementById('hist-anterior').disabled = pagination.page <= 1;
    document.getElementById('hist-proxima').disabled = pagination.page >= pagination.totalPages;
  } catch (err) {
    mostrarToast(err.message);
  }
}

function renderizarHistorico(registros) {
  const tbody = document.getElementById('tbody-historico');
  tbody.innerHTML = '';

  if (registros.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum registro encontrado.</td></tr>';
    return;
  }

  registros.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatarData(r.data)}</td>
      <td>${r.habito_nome}</td>
      <td><span class="status-pill ${r.concluido ? 'status-feito' : 'status-pendente'}">
        ${r.concluido ? 'Feito' : 'Pendente'}
      </span></td>
      <td>${r.observacao || '—'}</td>
      <td><button class="btn btn-danger" data-id="${r.id}">Excluir</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('button[data-id]').forEach(btn =>
    btn.addEventListener('click', async () => {
      const ok = await confirmarAcao('Excluir este registro?');
      if (!ok) return;
      try {
        await api('DELETE', `/registros/${btn.dataset.id}`);
        mostrarToast('Registro excluído');
        carregarHistorico();
      } catch (err) {
        mostrarToast(err.message);
      }
    })
  );
}

document.getElementById('form-habito').addEventListener('submit', salvarHabito);
document.getElementById('btn-cancelar').addEventListener('click', limparFormHabito);
document.getElementById('filtro-categoria').addEventListener('change', () => { paginaHabitos = 1; carregarHabitos(); });
document.getElementById('ordenar').addEventListener('change', () => { paginaHabitos = 1; carregarHabitos(); });
document.getElementById('direcao').addEventListener('change', () => { paginaHabitos = 1; carregarHabitos(); });
document.getElementById('pag-anterior').addEventListener('click', () => { paginaHabitos--; carregarHabitos(); });
document.getElementById('pag-proxima').addEventListener('click', () => { paginaHabitos++; carregarHabitos(); });

document.getElementById('form-registro').addEventListener('submit', salvarRegistro);
document.getElementById('hist-habito').addEventListener('change', () => { paginaHistorico = 1; carregarHistorico(); });
document.getElementById('hist-inicio').addEventListener('change', () => { paginaHistorico = 1; carregarHistorico(); });
document.getElementById('hist-fim').addEventListener('change', () => { paginaHistorico = 1; carregarHistorico(); });
document.getElementById('hist-anterior').addEventListener('click', () => { paginaHistorico--; carregarHistorico(); });
document.getElementById('hist-proxima').addEventListener('click', () => { paginaHistorico++; carregarHistorico(); });

// ---------------- inicialização ----------------
document.getElementById('registro-data').value = new Date().toISOString().split('T')[0];
carregarHabitos();
carregarHistorico();
