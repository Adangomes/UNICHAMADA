/**
 * base.js — peças básicas da aba Suporte: criar elementos, datas, aviso, janela e carregamento do CSS.
 *
 * Esta pasta "suporte/" é IDÊNTICA em js/professor/ e js/coordenador/: é a mesma tela para os dois.
 * Tudo fica dentro de window.Suporte, para não esbarrar em nada do resto do sistema.
 */
window.Suporte = window.Suporte || {};

(function () {
  const S = window.Suporte;

  // ---- CSS: CORRIGIDO PARA ESCAPAR AS BARRAS / \/
  const origem = document.currentScript ? document.currentScript.src : '';
  const dentroDePasta = /\/js\/(?:professor|coordenador)\/suporte\//.test(origem);
  S.pastaCss = dentroDePasta ? origem.replace(/\/js\/(?:professor|coordenador)\/suporte\/.*/, '/css/suporte/') : '';
  S.arquivosCss = ['base.css', 'lista.css', 'novo_chamado.css', 'detalhe.css'];
  S._css = null;

  /** Carrega os 4 CSS da aba (uma vez só). */
  S.carregarCss = function () {
    if (S._css) return S._css;
    S._css = Promise.all(S.arquivosCss.map((arq) => new Promise((resolve) => {
      if (!S.pastaCss || document.querySelector('link[href$="suporte/' + arq + '"]')) { resolve(); return; }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = S.pastaCss + arq;
      link.onload = resolve;
      link.onerror = () => { console.warn('[Suporte] CSS não encontrado: ' + link.href); resolve(); };
      setTimeout(resolve, 4000);
      document.head.append(link);
    }))).then(() => undefined);
    return S._css;
  };

  /** Cria um elemento HTML. */
  S.el = function (tag, attrs, filhos) {
    const no = document.createElement(tag);
    let valor;
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') no.className = v;
      else if (k === 'value') valor = v;
      else if (k.startsWith('on') && typeof v === 'function') no.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k in no && typeof no[k] === 'boolean') no[k] = !!v;
      else no.setAttribute(k, v === true ? '' : v);
    });
    [].concat(filhos === undefined ? [] : filhos).forEach((f) => {
      if (f !== null && f !== undefined && f !== false) no.append(f);
    });
    if (valor !== undefined) no.value = valor;
    return no;
  };

  S.util = {
    idade(iso) {
      if (!iso) return '';
      const min = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000));
      if (min < 1) return 'agora há pouco';
      if (min < 60) return 'há ' + min + ' min';
      const h = Math.floor(min / 60);
      if (h < 24) return 'há ' + h + 'h';
      const d = Math.floor(h / 24);
      return 'há ' + d + (d === 1 ? ' dia' : ' dias');
    },
    dataHora(iso) {
      return iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    },
    primeiroNome(nome) { return String(nome || '').trim().split(/\s+/)[0] || ''; },
    
    // CORRIGIDO: Escapando as barras nas Regex de navegador
    navegador() {
      const ua = navigator.userAgent || '';
      const nav = /\/Edg\//.test(ua) ? 'Edge' : /\/OPR\//.test(ua) ? 'Opera' : /\/Firefox\//.test(ua) ? 'Firefox'
        : /\/Chrome\//.test(ua) ? 'Chrome' : /\/Safari\//.test(ua) ? 'Safari' : 'Navegador';
      const so = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod|Mobile/i.test(ua) ? 'iOS'
        : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
      return so ? nav + ' em ' + so : nav;
    },
    aparelho() { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ? 'Celular' : 'Computador'; },
    contexto(e) {
      return {
        Perfil: S.T.quem[e.tipo] || e.tipo,
        Tela: (e.opcoes && e.opcoes.tela) || 'Aba Suporte',
        Navegador: S.util.navegador(),
        Aparelho: S.util.aparelho()
      };
    }
  };

  S.carregando = () => S.el('div', { class: 'su-carregando' }, ['Carregando…']);

  S.erroBloco = (mensagem, aoTentar) => S.el('div', { class: 'su-erro-bloco', role: 'alert' }, [
    S.el('p', {}, [mensagem]),
    aoTentar ? S.el('button', { class: 'su-btn su-btn-secundario', type: 'button', onClick: aoTentar }, ['Tentar de novo']) : null
  ]);

  S.toast = function (mensagem, tipo) {
    let area = document.querySelector('.su-toast-area');
    if (!area) { area = S.el('div', { class: 'su-toast-area', 'aria-live': 'polite' }); document.body.append(area); }
    const t = S.el('div', { class: 'su-toast' + (tipo === 'erro' ? ' erro' : '') }, [mensagem]);
    area.append(t);
    setTimeout(() => t.remove(), 4500);
  };

  S.modal = function ({ titulo, corpo, botoes }) {
    const fundo = S.el('div', { class: 'su-modal-fundo', onClick: (ev) => { if (ev.target === fundo) fechar(); } });
    function tecla(ev) { if (ev.key === 'Escape') fechar(); }
    function fechar() { document.removeEventListener('keydown', tecla); fundo.remove(); }
    const caixa = S.el('div', { class: 'su-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo }, [
      S.el('div', { class: 'su-modal-cab' }, [
        S.el('h2', {}, [titulo]),
        S.el('button', { class: 'su-modal-x', type: 'button', 'aria-label': 'Fechar', onClick: () => fechar() }, ['✕'])
      ]),
      S.el('div', { class: 'su-modal-corpo' }, [].concat(corpo)),
      botoes ? S.el('div', { class: 'su-modal-rodape' }, botoes) : null
    ]);
    document.addEventListener('keydown', tecla);
    fundo.append(caixa);
    document.body.append(fundo);
    return { fechar };
  };

  S.botao = function (texto, { tipo, onClick, desabilitado } = {}) {
    return S.el('button', {
      class: 'su-btn su-btn-' + (tipo || 'secundario'), type: 'button', disabled: !!desabilitado,
      onClick: async (ev) => {
        const b = ev.currentTarget;
        if (b.disabled || !onClick) return;
        b.disabled = true;
        try { await onClick(ev); }
        catch (err) { S.toast(err.message || 'Algo deu errado.', 'erro'); }
        finally { b.disabled = !!desabilitado; }
      }
    }, [texto]);
  };
})();
