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

// Tela do aluno com menu lateral estilo painel do professor
(function () {
  const FREQ_MINIMA = 75;
  const CHAVE = "unichamada_aluno_atual";
  let atual = null;
  let abaAtiva = "dashboard";

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
    const estiloItem = (aba) => `
      text-align: left; 
      background: ${abaAtiva === aba ? '#1b2a47' : 'transparent'}; 
      color: ${abaAtiva === aba ? '#ffffff' : '#333333'}; 
      border: none; 
      padding: 10px 16px; 
      border-radius: 6px; 
      cursor: pointer; 
      font-weight: ${abaAtiva === aba ? '600' : '400'}; 
      width: 100%;
      font-size: 0.95rem;
      transition: background 0.2s;
    `;

    raiz().innerHTML = `
      <header class="al-topo" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 30px; background: #ffffff; border-bottom: 1px solid #e2e8f0;">
        <div class="al-identidade-marca" style="display: flex; flex-direction: column;">
          <strong style="font-size: 1.1rem; color: #1b2a47;">UniChamada</strong>
          <span style="font-size: 0.8rem; color: #64748b;">Área do aluno</span>
        </div>
        <div class="al-acoes" style="display: flex; gap: 10px;">
          <button class="al-btn sec" data-acao="atualizar" style="padding: 6px 14px; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; cursor: pointer;">Atualizar</button>
          <button class="al-btn sec" data-acao="sair" style="padding: 6px 14px; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; cursor: pointer;">Sair</button>
        </div>
      </header>
      <div class="al-dashboard-layout" style="display: flex; min-height: calc(100vh - 70px);">
        <!-- Menu Lateral idêntico ao do professor -->
        <aside class="al-menu-lateral" style="width: 240px; background: #f8fafc; border-right: 1px solid #e2e8f0; padding: 24px 12px; display: flex; flex-direction: column; gap: 6px;">
          <button style="${estiloItem('dashboard')}" data-aba="dashboard">Dashboard</button>
          <button style="${estiloItem('chamadas')}" data-aba="chamadas">Chamadas Ativas</button>
          <button style="text-align: left; background: transparent; color: #333333; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 400; width: 100%; font-size: 0.95rem;" data-acao="agenda">Agenda</button>
        </aside>
        
        <!-- Área Principal de Conteúdo -->
        <main class="al-main-conteudo" style="flex: 1; padding: 30px; background: #fdfdfd; overflow-y: auto;">
          ${renderizarConteudo(d)}
        </main>
      </div>`;

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
      window._dadosAlunoCache = dados; 
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
