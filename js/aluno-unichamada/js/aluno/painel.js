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

// Tela do aluno padronizada com o design system do UniChamada
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
        <div class="secao-cabecalho">
          <div>
            <h2>Chamadas Ativas</h2>
            <p>Acompanhe e confirme sua presença nas aulas em andamento.</p>
          </div>
        </div>
        <div id="aluno-chamada-root"></div>`;
    }

    if (abaAtiva === "agenda") {
      return `
        <div class="secao-cabecalho">
          <div>
            <h2>Agenda</h2>
            <p>Seus compromissos e horários acadêmicos.</p>
          </div>
        </div>
        <div id="agenda-aluno-root"></div>`;
    }

    const { aluno, totais, grupos } = d, A = window.MAPA_BANCO.alunos;
    const f = pct(totais.presencas, totais.total);
    const corpo = grupos.length
      ? grupos.map((g) => `<section class="al-curso"><h2>${esc(g.curso)}</h2>${g.disciplinas.map(disciplina).join("")}`).join("")
      : `<p class="al-estado">Você ainda não está matriculado em nenhuma disciplina.</p>`;

    return `
      <section class="al-ola" style="margin-bottom: 1.5rem;">
        <h1>Olá, ${esc(aluno[A.nome])}</h1>
      </section>
      <section class="al-resumo">
        <div><b>${totais.presencas}</b><span>Presenças</span></div>
        <div><b>${totais.faltas}</b><span>Faltas</span></div>
        <div><b>${f === null ? "—" : f + "%"}</b><span>Frequência</span></div>
      </section>${corpo}`;
  }

  function desenhar(d) {
    const inicial = d.aluno && d.aluno.nome ? d.aluno.nome.charAt(0).toUpperCase() : "A";

    raiz().innerHTML = `
      <div class="painel">
        <header class="painel-header">
          <div class="identidade">
            <div class="avatar-inicial">${inicial}</div>
            <div class="textos">
              <strong>${esc(d.aluno.nome)}</strong>
              <span>Área do aluno</span>
            </div>
          </div>
          <div class="al-acoes">
            <button class="al-btn sec" data-acao="atualizar">Atualizar</button>
            <button class="btn-sair" data-acao="sair">Sair</button>
          </div>
        </header>

        <div class="painel-corpo">
          <!-- Menu lateral padrão igual ao do professor/coordenador -->
          <aside class="painel-nav">
            <div class="painel-nav-grupo">
              <button class="${abaAtiva === 'dashboard' ? 'ativo' : ''}" data-aba="dashboard">Dashboard</button>
              <button class="${abaAtiva === 'chamadas' ? 'ativo' : ''}" data-aba="chamadas">Chamadas Ativas</button>
              <button class="${abaAtiva === 'agenda' ? 'ativo' : ''}" data-aba="agenda">Agenda</button>
            </div>
          </aside>

          <!-- Conteúdo Principal padronizado -->
          <main class="painel-conteudo">
            ${renderizarConteudo(d)}
          </main>
        </div>
      </div>`;

    // Inicializa os componentes dependendo da aba ativa
    if (abaAtiva === "chamadas" && window.AlunoChamada && window.AlunoChamada.montar) {
      window.AlunoChamada.montar(document.getElementById("aluno-chamada-root"), d.aluno);
    }
    if (abaAtiva === "agenda" && window.UnichamadaAgendaUI && atual) {
      window.UnichamadaAgendaUI.montar(
        document.getElementById("agenda-aluno-root"),
        { papel: "aluno", id: atual.id, nome: atual.nome, ra: atual.ra }
      );
    }
  }

  async function abrir(alunoObj) {
    atual = alunoObj;
    const el = raiz();
    const login = document.getElementById("tela-login");
    if (login) login.classList.add("oculto");
    el.classList.remove("oculto");
    el.innerHTML = `<div class="painel"><header class="painel-header"><div class="identidade"><div class="textos"><strong>UniChamada</strong><span>Área do aluno</span></div></div></header><div class="painel-corpo"><main class="painel-conteudo"><p class="al-estado">Carregando dados acadêmicos...</p></main></div></div>`;
    try { 
      const dados = await window.DadosAluno.carregar(alunoObj);
      window._dadosAlunoCache = dados; 
      desenhar(dados); 
    }
    catch (e) {
      console.error(e);
      el.innerHTML = `<div class="painel"><main class="painel-conteudo"><div class="al-estado"><p>Não foi possível carregar seus dados.</p><button class="al-btn" data-acao="atualizar">Tentar de novo</button> <button class="al-btn sec" data-acao="sair">Sair</button></div></main></div>`;
    }
  }

  function clique(e) {
    const aba = e.target.closest("[data-aba]")?.dataset.aba;
    if (aba) {
      // Para a agenda se sair dela
      if (abaAtiva === "agenda" && window.UnichamadaAgendaUI) {
        try { window.UnichamadaAgendaUI.parar(); } catch(err) {}
      }
      abaAtiva = aba;
      if (window._dadosAlunoCache) desenhar(window._dadosAlunoCache);
      return;
    }

    const acao = e.target.closest("[data-acao]")?.dataset.acao;
    if (acao === "sair") { 
      if (window.AlunoChamada) window.AlunoChamada.parar();
      if (window.UnichamadaAgendaUI) try { window.UnichamadaAgendaUI.parar(); } catch(err) {}
      sessionStorage.clear(); 
      location.reload(); 
    }
    if (acao === "atualizar" && atual) abrir(atual);
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
