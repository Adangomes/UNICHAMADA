// Tela do aluno: cursos, disciplinas, presenças e faltas
(function () {
  const FREQ_MINIMA = 75; // % mínimo de frequência
  const CHAVE = "aluno_sessao";
  let atual = null;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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

  function desenhar(d) {
    const { aluno, totais, grupos } = d, A = window.MAPA_BANCO.alunos;
    const f = pct(totais.presencas, totais.total);
    const corpo = grupos.length
      ? grupos.map((g) => `<section class="al-curso"><h2>${esc(g.curso)}</h2>${g.disciplinas.map(disciplina).join("")}</section>`).join("")
      : `<p class="al-estado">Você ainda não está matriculado em nenhuma disciplina.</p>`;
    raiz().innerHTML = `
      <header class="al-topo"><div><strong>UniChamada</strong><span>Área do aluno</span></div>
        <div class="al-acoes"><button class="al-btn sec" data-acao="atualizar">Atualizar</button><button class="al-btn sec" data-acao="sair">Sair</button></div></header>
      <main class="al-main">
        <section class="al-ola"><h1>Olá, ${esc(aluno[A.nome])}</h1><p>RA ${esc(aluno[A.ra])} · ${esc(aluno[A.email])}</p></section>
        <section class="al-resumo">
          <div><b>${totais.presencas}</b><span>Presenças</span></div>
          <div><b>${totais.faltas}</b><span>Faltas</span></div>
          <div><b>${f === null ? "—" : f + "%"}</b><span>Frequência</span></div>
        </section>${corpo}
      </main>`;
  }

  async function abrir(aluno) {
    atual = aluno;
    const el = raiz();
    const login = document.getElementById("tela-login");
    if (login) login.classList.add("oculto");
    el.classList.remove("oculto");
    el.innerHTML = `<p class="al-estado">Carregando…</p>`;
    try { desenhar(await window.DadosAluno.carregar(aluno)); }
    catch (e) {
      console.error(e);
      el.innerHTML = `<div class="al-estado"><p>Não foi possível carregar seus dados.</p><button class="al-btn" data-acao="atualizar">Tentar de novo</button> <button class="al-btn sec" data-acao="sair">Sair</button></div>`;
    }
  }

  function clique(e) {
    const acao = e.target.closest("[data-acao]")?.dataset.acao;
    if (acao === "sair") { sessionStorage.clear(); location.reload(); }
    if (acao === "atualizar" && atual) abrir(atual);
  }

  // Chame no login: devolve true se RA + e-mail forem de um aluno
  async function entrar(ra, email) {
    const aluno = await window.DadosAluno.autenticar(ra, email);
    if (!aluno) return false;
    sessionStorage.setItem(CHAVE, JSON.stringify(aluno));
    abrir(aluno);
    return true;
  }
  // Chame no main.js: reabre a tela se o aluno já estava logado
  function restaurar() {
    try { const s = sessionStorage.getItem(CHAVE); if (!s) return false; abrir(JSON.parse(s)); return true; }
    catch { return false; }
  }

  window.PainelAluno = { entrar, restaurar, abrir };
})();
