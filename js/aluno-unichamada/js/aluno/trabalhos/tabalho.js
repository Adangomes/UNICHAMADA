// Aluno > Trabalho: perguntas da aula. Só aparecem e só podem ser respondidas com a aula ativa.
// Lê a view perguntas_do_aluno (sem a resposta esperada) e envia pela função responder_pergunta.
window.AlunoTrabalho = (function () {
  const { esc, listar, igual, rpc } = window.AulaApi;
  let timer = null, aluno = null, raiz = null, msg = "", digitando = false;

  async function atualizar() {
    if (digitando) return; // não apaga o que o aluno está escrevendo
    try {
      const meuId = aluno[window.MAPA_BANCO.alunos.id];
      const todas = await listar("perguntas_do_aluno");
      desenhar(todas.filter((p) => igual(p.aluno_id, meuId)));
    } catch (e) { console.error(e); raiz.innerHTML = `<p class="al-estado">Não foi possível carregar as perguntas.</p>`; }
  }

  function desenhar(lista) {
    if (!lista.length) { raiz.innerHTML = `<p class="al-estado">Nenhuma pergunta pendente.</p>`; return; }
    raiz.innerHTML = lista.map((p) => p.respondida
      ? `<div class="al-disc ok"><div class="al-linha"><span class="al-nome">${esc(p.enunciado)}</span><b class="al-tag p">Respondida</b></div></div>`
      : `<div class="al-disc risco"><div class="al-linha"><span class="al-nome">${esc(p.enunciado)}</span></div>
           <textarea rows="3" style="width:100%" data-resp="${esc(p.id)}" placeholder="Escreva sua resposta"></textarea>
           <button class="al-btn" data-acao="enviar" data-id="${esc(p.id)}">Enviar resposta</button></div>`
    ).join("") + (msg ? `<p class="al-meta">${esc(msg)}</p>` : "");
  }

  async function enviar(id, botao) {
    const campo = raiz.querySelector(`[data-resp="${id}"]`);
    const texto = campo ? campo.value.trim() : "";
    if (!texto) { if (campo) campo.placeholder = "Escreva a resposta antes de enviar."; return; }
    botao.disabled = true;
    try {
      const r = await rpc("responder_pergunta", { p_pergunta_aluno: id, p_aluno: aluno[window.MAPA_BANCO.alunos.id], p_texto: texto });
      msg = r.ok ? "Resposta enviada." : r.motivo;
    } catch (e) { msg = e.message || "Erro ao enviar."; }
    digitando = false;
    atualizar();
  }

  function montar(el, alunoLogado) {
    parar();
    aluno = alunoLogado; raiz = el;
    raiz.oninput = () => { digitando = true; };
    raiz.onclick = (e) => {
      const b = e.target.closest('[data-acao="enviar"]');
      if (b) enviar(b.dataset.id, b);
    };
    atualizar();
    timer = setInterval(atualizar, 5000);
  }

  function parar() { if (timer) clearInterval(timer); timer = null; }

  return { montar, parar };
})();
