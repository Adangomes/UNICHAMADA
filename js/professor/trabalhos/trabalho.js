// Professor > Trabalho: Permite criar e lançar perguntas/atividades para a aula ativa.
window.ProfessorTrabalho = (function () {
  const { esc, listar, rpc } = window.AulaApi;
  let raiz = null, msg = "";

  async function buscarAulasAtivas() {
    try {
      const aulas = await listar("aulas");
      return aulas.filter(a => a.status === "ativa");
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async function desenhar() {
    if (!raiz) return;
    const aulasAtivas = await buscarAulasAtivas();

    if (!aulasAtivas.length) {
      raiz.innerHTML = `
        <div class="secao-cabecalho">
          <div>
            <h2>Trabalhos e Perguntas da Aula</h2>
            <p>Lançamento de atividades interativas para os alunos.</p>
          </div>
        </div>
        <p class="estado-vazio">Nenhuma aula ativa no momento. Inicie uma aula para lançar perguntas.</p>`;
      return;
    }

    raiz.innerHTML = `
      <div class="secao-cabecalho">
        <div>
          <h2>Lançar Perguntas da Aula</h2>
          <p>Adicione uma ou mais perguntas e defina a resposta esperada (gabarito).</p>
        </div>
      </div>
      <form id="form-lancar-perguntas" style="background: var(--papel-cartao, #fff); padding: 20px; border-radius: 8px; border: 1px solid var(--linha, #DAD5C6); margin-bottom: 20px;">
        <div style="margin-bottom: 15px;">
          <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Selecione a Aula Ativa:</label>
          <select id="select-aula-ativa" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--linha);">
            ${aulasAtivas.map(a => `<option value="${esc(a.id)}">Aula ID: ${esc(a.id)} (Turma: ${esc(a.turma_id)})</option>`).join("")}
          </select>
        </div>

        <div id="container-perguntas" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 15px;">
          <div class="bloco-pergunta" style="background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 10px;">
            <input type="text" class="input-enunciado" placeholder="Enunciado da pergunta (ex: O que é uma chave estrangeira?)" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1;" required />
            <input type="text" class="input-gabarito" placeholder="Resposta esperada / Gabarito" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1;" />
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          <button type="button" class="al-btn sec" data-acao="adicionar-campo" style="background: #e2e8f0; color: #1e293b; border: none; padding: 8px 14px; border-radius: 4px; cursor: pointer;">+ Adicionar outra pergunta</button>
        </div>

        <button type="submit" class="al-btn" style="background: var(--tinta, #1F2D50); color: #fff; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Enviar perguntas para os alunos</button>
      </form>
      ${msg ? `<p class="al-meta" style="font-weight: 600; color: var(--ok, #3E7C5A);">${esc(msg)}</p>` : ""}
    `;
  }

  function montar(el) {
    raiz = el;
    desenhar();

    raiz.onclick = async (e) => {
      const acao = e.target.closest("[data-acao]")?.dataset.acao;
      if (acao === "adicionar-campo") {
        const container = raiz.querySelector("#container-perguntas");
        const novoBloco = document.createElement("div");
        novoBloco.className = "bloco-pergunta";
        novoBloco.style.cssText = "background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 10px; position: relative;";
        novoBloco.innerHTML = `
          <input type="text" class="input-enunciado" placeholder="Enunciado da pergunta" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1;" required />
          <input type="text" class="input-gabarito" placeholder="Resposta esperada / Gabarito" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1;" />
          <button type="button" data-acao="remover-bloco" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: #ef4444; font-weight: bold; cursor: pointer;" title="Remover">✕</button>
        `;
        container.appendChild(novoBloco);
      }

      if (acao === "remover-bloco") {
        e.target.closest(".bloco-pergunta")?.remove();
      }
    };

    raiz.onsubmit = async (e) => {
      e.preventDefault();
      const aulaId = raiz.querySelector("#select-aula-ativa")?.value;
      const blocos = raiz.querySelectorAll(".bloco-pergunta");
      
      const perguntas = Array.from(blocos).map(b => ({
        enunciado: b.querySelector(".input-enunciado").value.trim(),
        resposta_esperada: b.querySelector(".input-gabarito").value.trim()
      })).filter(p => p.enunciado);

      if (!aulaId || !perguntas.length) {
        msg = "Preencha ao menos uma pergunta.";
        desenhar();
        return;
      }

      try {
        // Envia cada pergunta através da função RPC correspondente no Supabase
        for (const p of perguntas) {
          await rpc("lancar_pergunta", {
            p_aula: aulaId,
            p_enunciado: p.enunciado,
            p_resposta_esperada: p.resposta_esperada
          });
        }
        msg = "Perguntas lançadas com sucesso para os alunos!";
        desenhar();
      } catch (err) {
        console.error(err);
        msg = err.message || "Erro ao lançar perguntas.";
        desenhar();
      }
    };
  }

  function parar() {
    raiz = null;
    msg = "";
  }

  return { montar, parar };
})();
