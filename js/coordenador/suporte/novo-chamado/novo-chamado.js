/**
 * novo-chamado/novo-chamado.js — janela "Abrir chamado": assunto, categoria, descrição e, para
 * equipamento/rede, o local e o patrimônio. Anexa sozinha a tela, o navegador e o aparelho.
 * Dados: Suporte.dados.chamados.abrir (tabela ti_chamados).
 */
window.Suporte = window.Suporte || {};

window.Suporte.novoChamado = {
  /**
   * @param {Object} e  estado da aba (tipo, id, opcoes)
   * @param {Function} aoEnviar  recebe o código do chamado criado (ex.: "CH-0012")
   */
  abrir(e, aoEnviar) {
    const S = window.Suporte;
    const { el } = S;
    const T = S.T;

    const assunto = el('input', { class: 'su-input', type: 'text', maxlength: '120', placeholder: 'Resuma o problema em poucas palavras', 'aria-label': 'Assunto' });
    const categoria = el('select', { class: 'su-select', 'aria-label': 'Categoria' }, [
      el('option', { value: '' }, ['Escolha uma opção…']),
      ...T.categorias.map((c) => el('option', { value: c.valor }, [c.rotulo]))
    ]);
    const local = el('input', { class: 'su-input', type: 'text', maxlength: '100', placeholder: 'Ex.: Sala 12, bloco A', 'aria-label': 'Local' });
    const patrimonio = el('input', { class: 'su-input', type: 'text', maxlength: '40', placeholder: 'Número da etiqueta (se souber)', 'aria-label': 'Patrimônio' });
    const descricao = el('textarea', { class: 'su-textarea', rows: '5', maxlength: '4000', placeholder: 'O que aconteceu? O que você esperava?', 'aria-label': 'Descrição' });
    const erro = el('div', { class: 'su-erro', role: 'alert', hidden: true });

    // local e patrimônio só aparecem para problemas de equipamento ou rede
    const blocoFisico = el('div', { class: 'su-grade', hidden: true }, [
      el('label', { class: 'su-campo' }, ['Local', local]),
      el('label', { class: 'su-campo' }, ['Patrimônio', patrimonio])
    ]);
    categoria.addEventListener('change', () => { blocoFisico.hidden = categoria.value !== 'infraestrutura'; });

    const mostrarErro = (texto) => { erro.textContent = texto; erro.hidden = !texto; };

    const modal = S.modal({
      titulo: 'Abrir chamado',
      corpo: [
        el('p', { class: 'su-sub' }, [T.dicaNovo]),
        erro,
        el('label', { class: 'su-campo' }, ['Assunto', assunto]),
        el('label', { class: 'su-campo' }, ['O que está acontecendo?', categoria]),
        blocoFisico,
        el('label', { class: 'su-campo' }, ['Descrição', descricao])
      ],
      botoes: [
        S.botao('Cancelar', { onClick: () => modal.fechar() }),
        S.botao('Enviar chamado', { tipo: 'primario', onClick: async () => {
          mostrarErro('');
          const dados = {
            titulo: assunto.value.trim(), descricao: descricao.value.trim(), categoria: categoria.value,
            local: local.value.trim(), patrimonio: patrimonio.value.trim(), contexto: S.util.contexto(e)
          };
          if (dados.titulo.length < 3) { mostrarErro('Escreva o assunto (pelo menos 3 letras).'); return; }
          if (!dados.categoria) { mostrarErro('Escolha o que está acontecendo.'); return; }
          if (dados.descricao.length < 5) { mostrarErro('Descreva o problema com um pouco mais de detalhe.'); return; }
          let codigo;
          try { codigo = await S.dados.chamados.abrir(e.tipo, e.id, dados); }
          catch (err) { mostrarErro(err.message); return; }
          modal.fechar();
          S.toast('Chamado ' + codigo + ' enviado. A equipe de TI responde por aqui.');
          if (aoEnviar) aoEnviar(codigo);
        } })
      ]
    });
    assunto.focus();
  }
};
