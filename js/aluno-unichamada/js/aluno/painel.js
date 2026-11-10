// Nomes das tabelas e colunas do Supabase usadas pela tela do aluno.
window.MAPA_BANCO = {
  alunos:      { tabela: "alunos",      id: "id", nome: "nome", ra: "ra", email: "email" },
  cursos:      { tabela: "cursos",      id: "id", nome: "nome" },
  disciplinas: { tabela: "disciplinas", id: "id", nome: "nome", curso: "curso_id" },
  turmas:      { tabela: "turmas",      id: "id", disciplina: "disciplina_id" },
  matriculas:  { tabela: "matriculas",  aluno: "aluno_id", turma: "turma_id" },
  chamadas:    { tabela: "chamadas",    id: "id", turma: "turma_id", data: "data" },
  presencas:   { tabela: "presencas",   chamada: "chamada_id", aluno: "aluno_id", status: null }
};

// Tela do aluno com menu lateral estilo Dashboard
(function () {
  const FREQ_MINIMA = 75;
  const CHAVE = "unichamada_aluno_atual";
  let atual = null;
  let abaAtiva = "dashboard"; // Aba inicial padrão

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, "");
  const pct = (p, t) => (t ? Math.round((p / t) * 100) : null);
  const fmtData = (d) => {
    const dt = new Date(d);
    return isNaN(dt) ? esc(d) : dt.toLocaleDateString("pt-BR", { timeZone: String(d).length === 10 ? "UTC" : undefined });
  };

  const raiz = () => {
    let el = document.getElementById("tela-aluno");
    if (!el) { el = document.createElement("section"); el.id = "tela-aluno"; el.className = "oculto"; document.body.appendChild(el); el.addEventListener("click", clique); }
    else if (!el.dataset.ligado) { el.dataset.ligado = "1"; el.addEventListener("click", clique); }
    return el;
  };

  function disciplina(d) {
    const f = pct(d.presencas, d.total);
    const estado = f === null ? "vazio" : f >= FREQ_MINIMA ? "ok" : "risco";
    const aulas = d.aulas.length
      ? d.aulas.map((a) => `<li><span>${fmtData(a.data)}</span><b class="al-tag ${a.presente ? "p" : "f"}">${a.presente ? "Presente" : "Falta"}</b></li>`).join("")
      : `<li class="al-vazio">Nenhuma chamada registrada ainda.</li>`;
    return `<details class="al-disc ${estado}"><summary>
      <div class="al-linha"><span class="al-nome">${esc(d.nome)}</span><span class="al-freq">${f === null ? "—" : f + "%"}</span></div>
      <div class="al-barra"><i style="width:${f ?? 0}%"></i></div>
      <div class="al-meta">${d.presencas} presenças · ${d.faltas} faltas${estado === "risco" ? ` · abaixo de ${FREQ_MINIMA}%` : ""}</div>
    </summary><ul class="al-aulas">${aulas}</ul></details>`;
  }

  function renderizarConteudo(d) {
    if (abaAtiva === "chamadas") {
      return `
        <div class="al-secao-conteudo">
          <h2>Chamadas Ativas</h2>
          <div id="aluno-chamada-root"></div>
        </div>`;
    }

    // Conteúdo padrão: Dashboard (Resumo + Cursos/Disciplinas)
    const { aluno, totais, grupos } = d, A = window.MAPA_BANCO.alunos;
    const f = pct(totais.presencas, totais.total);
    const corpo = grupos.length
      ? grupos.map((g) => `<section class="al-curso"><h2>${esc(g.curso)}</h2>${g.disciplinas.map(disciplina).join("")}`).join("")
      : `<p class="al-estado">Você ainda não está matriculado em nenhuma disciplina.</p>`;

    return `
      <div class="al-secao-conteudo">
        <section class="al-ola">
          <h1>Olá, ${esc(aluno[A.nome])}</h1>
        </section>
        <section class="al-resumo">
          <div><b>${totais.presencas}</b><span>Presenças</span></div>
          <div><b>${totais.faltas}</b><span>Faltas</span></div>
          <div><b>${f === null ? "—" : f + "%"}</b><span>Frequência</span></div>
        </section>${corpo}
      </div>`;
  }

  function desenhar(d) {
    raiz().innerHTML = `
      <header class="al-topo">
        <div class="al-identidade-marca">
          <strong>UniChamada</strong>
          <span>Área do aluno</span>
        </div>
        <div class="al-acoes">
          <button class="al-btn sec" data-acao="atualizar">Atualizar</button>
          <button class="al-btn sec" data-acao="sair">Sair</button>
        </div>
      </header>
      <div class="al-dashboard-layout" style="display: flex; min-height: calc(100vh - 60px);">
        <!-- Menu Lateral -->
        <aside class="al-menu-lateral" style="width: 260px; background: #f8f9fa; border-right: 1px solid #e9ecef; padding: 20px 10px; display: flex; flex-direction: column; gap: 8px;">
          <button class="al-menu-item ${abaAtiva === 'dashboard' ? 'ativo' : ''}" data-aba="dashboard" style="text-align: left; background: ${abaAtiva === 'dashboard' ? '#e2e8f0' : 'transparent'}; border: none; padding: 12px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; width: 100%;">📊 Dashboard</button>
          <button class="al-menu-item ${abaAtiva === 'chamadas' ? 'ativo' : ''}" data-aba="chamadas" style="text-align: left; background: ${abaAtiva === 'chamadas' ? '#e2e8f0' : 'transparent'}; border: none; padding: 12px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; width: 100%;">📋 Chamadas Ativas</button>
          <button class="al-menu-item" data-acao="agenda" style="text-align: left; background: transparent; border: none; padding: 12px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; width: 100%;">📅 Agenda</button>
        </aside>
        
        <!-- Área Principal de Conteúdo -->
        <main class="al-main-conteudo" style="flex: 1; padding: 30px; background: #fff; overflow-y: auto;">
          ${renderizarConteudo(d)}
        </main>
      </div>`;

    // Se estiver na aba de chamadas ativas, inicializa o componente de chamada
    if (abaAtiva === "chamadas" && window.AlunoChamada && window.AlunoChamada.montar) {
      window.AlunoChamada.montar(document.getElementById("aluno-chamada-root"), d.aluno);
    }
  }

  async function abrir(alunoObj) {
    atual = alunoObj;
    const el = raiz();
    const login = document.getElementById("tela-login");
    if (login) login.classList.add("oculto");
    el.classList.remove("oculto");
    el.innerHTML = `<header class="al-topo"><div class="al-identidade-marca"><strong>UniChamada</strong><span>Área do aluno</span></div></header><p class="al-estado">Carregando dados acadêmicos...</p>`;
    try { 
      const dados = await window.DadosAluno.carregar(alunoObj);
      window._dadosAlunoCache = dados; // Salva cache para alternar abas sem recarregar tudo
      desenhar(dados); 
    }
    catch (e) {
      console.error(e);
      el.innerHTML = `<div class="al-estado"><p>Não foi possível carregar seus dados.</p><button class="al-btn" data-acao="atualizar">Tentar de novo</button> <button class="al-btn sec" data-acao="sair">Sair</button></div>`;
    }
  }

  function clique(e) {
    const aba = e.target.closest("[data-aba]")?.dataset.aba;
    if (aba) {
      abaAtiva = aba;
      if (window._dadosAlunoCache) desenhar(window._dadosAlunoCache);
      return;
    }

    const acao = e.target.closest("[data-acao]")?.dataset.acao;
    if (acao === "sair") { 
      if (window.AlunoChamada) window.AlunoChamada.parar();
      sessionStorage.clear(); 
      location.reload(); 
    }
    if (acao === "atualizar" && atual) abrir(atual);
    if (acao === "agenda" && atual) {
      const el = raiz();
      el.querySelector(".al-dashboard-layout")?.classList.add("oculto");
      let painelAgenda = el.querySelector(".al-agenda-wrap");
      if (!painelAgenda) {
        painelAgenda = document.createElement("section");
        painelAgenda.className = "al-agenda-wrap";
        painelAgenda.innerHTML = '<button class="al-btn sec" type="button" data-acao="voltar-agenda" style="margin: 20px;">Voltar ao painel</button><div id="agenda-aluno-root" style="padding: 0 20px;"></div>';
        el.appendChild(painelAgenda);
      }
      painelAgenda.classList.remove("oculto");
      window.UnichamadaAgendaUI.montar(
        painelAgenda.querySelector("#agenda-aluno-root"),
        { papel: "aluno", id: atual.id, nome: atual.nome, ra: atual.ra }
      );
    }
    if (acao === "voltar-agenda") {
      window.UnichamadaAgendaUI.parar();
      raiz().querySelector(".al-agenda-wrap")?.remove();
      raiz().querySelector(".al-dashboard-layout")?.classList.remove("oculto");
    }
  }

  async function entrar(ra, email) {
    const aluno = await window.DadosAluno.autenticar(ra, email);
    if (!aluno) return false;
    sessionStorage.setItem(CHAVE, JSON.stringify(aluno));
    abrir(aluno);
    return true;
  }

  function restaurar() {
    try { 
      const s = sessionStorage.getItem(CHAVE); 
      if (!s) return false; 
      abrir(JSON.parse(s)); 
      return true; 
    }
    catch { return false; }
  }

  window.PainelAluno = { entrar, restaurar, abrir };

  window.addEventListener('DOMContentLoaded', () => {
    restaurar();
  });
})();
