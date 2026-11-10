// Aluno > Chamada: mostra se há chamada ativa nas turmas dele e confirma a presença.
// Só aparece se a aula da turma estiver ativa. Quem decide é o servidor (confirmar_presenca).
window.AlunoChamada = (function () {
  const { esc, listar, igual, rpc, posicao } = window.AulaApi;
  let timer = null, aluno = null, raiz = null, msg = "";

  async function buscar() {
    const M = window.MAPA_BANCO, meuId = aluno[M.alunos.id];
    const [mats, aulas, chams, pres, turmas, discs] = await Promise.all(
      ["matriculas", "aulas", "chamadas", "presencas", "turmas", "disciplinas"].map(listar)
    );
    const minhasTurmas = mats.filter((m) => igual(m[M.matriculas.aluno], meuId)).map((m) => m[M.matriculas.turma]);
    const aulasAtivas = aulas.filter((a) => a.status === "ativa" && minhasTurmas.some((t) => igual(t, a.turma_id)));
    return aulasAtivas.map((a) => {
      const chamada = chams.find((c) => igual(c.aula_id, a.id) && c.status === "ativa");
      const turma = turmas.find((t) => igual(t[M.turmas.id], a.turma_id));
      const disc = turma && discs.find((d) => igual(d[M.disciplinas.id], turma[M.turmas.disciplina]));
      const jaPresente = chamada && pres.some((p) => igual(p[M.presencas.chamada], chamada.id) && igual(p[M.presencas.aluno], meuId));
      return { aula: a, chamada, jaPresente, nome: (disc && disc[M.disciplinas.nome]) || "Aula" };
    });
  }

  function desenhar(itens) {
    if (!itens.length) { raiz.innerHTML = `<p class="al-estado">Nenhuma aula ativa agora.</p>`; return; }
    raiz.innerHTML = itens.map((i) => {
      let acao;
      if (!i.chamada) acao = `<span class="al-meta">Aula ativa, chamada ainda não aberta.</span>`;
      else if (i.jaPresente) acao = `<b class="al-tag p">Presença confirmada</b>`;
      else acao = `<button class="al-btn" data-acao="confirmar" data-chamada="${esc(i.chamada.id)}">Confirmar presença</button>`;
      return `<div class="al-disc ok"><div class="al-linha"><span class="al-nome">${esc(i.nome)}</span>${acao}</div></div>`;
    }).join("") + (msg ? `<p class="al-meta">${esc(msg)}</p>` : "");
  }

  async function atualizar() {
    try { desenhar(await buscar()); } catch (e) { console.error(e); raiz.innerHTML = `<p class="al-estado">Não foi possível carregar a chamada.</p>`; }
  }

  async function confirmar(chamadaId, botao) {
    botao.disabled = true; msg = "Verificando localização...";
    try {
      const p = await posicao();
      const r = await rpc("confirmar_presenca", { p_chamada: chamadaId, p_aluno: aluno[window.MAPA_BANCO.alunos.id], p_lat: p.lat, p_lng: p.lng });
      msg = r.ok ? "Presença confirmada." : r.motivo;
    } catch (e) { msg = e.message || "Erro ao confirmar."; }
    await atualizar();
  }

  function montar(el, alunoLogado) {
    parar();
    aluno = alunoLogado; raiz = el;
    raiz.onclick = (e) => {
      const b = e.target.closest('[data-acao="confirmar"]');
      if (b) confirmar(b.dataset.chamada, b);
    };
    atualizar();
    timer = setInterval(atualizar, 5000); // troque por Realtime quando quiser
  }

  function parar() { if (timer) clearInterval(timer); timer = null; }

  return { montar, parar };
})();
