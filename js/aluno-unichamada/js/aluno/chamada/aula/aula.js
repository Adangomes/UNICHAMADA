// Professor > Minhas turmas: ativar e encerrar a aula de uma turma.
// Uso: window.AulaProfessor.montar(elementoDentroDoCardDaTurma, { turmaId, professorId });
// Ao ativar, a posição do computador do professor vira o centro do raio da chamada.
window.AulaProfessor = (function () {
  const { esc, listar, igual, rpc, posicao } = window.AulaApi;

  async function aulaAtiva(turmaId) {
    const aulas = await listar("aulas");
    return aulas.find((a) => a.status === "ativa" && igual(a.turma_id, turmaId)) || null;
  }

  async function montar(el, { turmaId, professorId }) {
    let msg = "";

    async function desenhar() {
      let a = null;
      try { a = await aulaAtiva(turmaId); } catch (e) { console.error(e); msg = "Não foi possível ler o estado da aula."; }
      el.innerHTML = a
        ? `<span class="al-tag p">Aula ativa</span> <button class="al-btn sec" data-acao="encerrar-aula">Encerrar aula</button>`
        : `<button class="al-btn" data-acao="ativar-aula">Ativar aula</button>`;
      if (msg) el.insertAdjacentHTML("beforeend", ` <span class="al-meta">${esc(msg)}</span>`);
      el.dataset.aula = a ? a.id : "";
    }

    el.onclick = async (e) => {
      const acao = e.target.closest("[data-acao]")?.dataset.acao;
      if (!acao) return;
      e.target.disabled = true; msg = "";
      try {
        if (acao === "ativar-aula") {
          const p = await posicao();
          await rpc("ativar_aula", { p_turma: turmaId, p_professor: professorId || null, p_lat: p.lat, p_lng: p.lng, p_raio: 100 });
        } else if (acao === "encerrar-aula" && el.dataset.aula) {
          await rpc("encerrar_aula", { p_aula: el.dataset.aula });
        }
      } catch (err) { msg = err.message || "Erro na operação."; }
      desenhar();
    };

    await desenhar();
  }

  return { montar, aulaAtiva };
})();
