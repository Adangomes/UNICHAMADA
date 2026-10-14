/**
 * componentes/controles.js — botão, campo, input, textarea e select.
 * Faz parte de TI.ui (as peças de interface). Os blocos: chips.js, controles.js, blocos.js, janelas.js.
 */
window.TI = window.TI || {};
TI.ui = TI.ui || {};

(function () {
  const { el } = TI.dom;
  const K = TI.K;
  const ui = TI.ui;

  /** Botão que se desativa enquanto a ação roda e mostra erros em aviso. */
  ui.botao = (texto, o) => {
    o = o || {};
    return el('button', {
      class: 'ti-btn ti-btn-' + (o.tipo || 'secundario') + (o.pequeno ? ' pequeno' : ''),
      type: 'button',
      disabled: !!o.desabilitado,
      title: o.titulo,
      onClick: async (e) => {
        const b = e.currentTarget;
        if (b.disabled || !o.onClick) return;
        b.disabled = true;
        try { await o.onClick(e); }
        catch (err) { ui.toast(err.message || 'Algo deu errado.', 'erro'); }
        finally { b.disabled = !!o.desabilitado; }
      }
    }, [texto]);
  };

  ui.campo = (rotulo, controle) => el('label', { class: 'ti-campo' }, [rotulo, controle]);

  ui.input = (attrs) => el('input', Object.assign({ class: 'ti-input' }, attrs));

  ui.textarea = (attrs) => el('textarea', Object.assign({ class: 'ti-textarea' }, attrs));

  /** opcoes = [[valor, rotulo], ...] */
  ui.select = (opcoes, valor, attrs) => el('select', Object.assign({ class: 'ti-select', value: valor }, attrs),
    opcoes.map(([v, r]) => el('option', { value: v }, [r])));
})();
