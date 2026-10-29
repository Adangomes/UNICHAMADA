/**
 * estilos.js — carrega as fontes e os arquivos de css/ (o index.html não tem nenhum <link>).
 *
 *  - base()            no início: fonte + base/base.css + os blocos de comum/componentes/ (valem para todas as telas)
 *  - carregar([...])   carrega só os arquivos da tela que está abrindo (cada um uma vez só)
 *  - GRUPOS            listas prontas: base, layout (depois do login) e login
 *
 * Quais arquivos cada tela usa está em js/app/rotas.js (campo "css").
 */
window.TI = window.TI || {};

TI.estilos = {
  _mapa: new Map(),   // arquivo -> promessa (assim cada CSS é carregado uma vez só)

  /** Listas de arquivos que andam juntos. Para um bloco novo de CSS comum, acrescente aqui. */
  GRUPOS: {
    base: [
      'base/base.css',
      'comum/componentes/cartoes_e_linhas.css',
      'comum/componentes/chips_e_avatar.css',
      'comum/componentes/botoes_e_formularios.css',
      'comum/componentes/pilulas_barras_e_pares.css',
      'comum/componentes/estados_e_texto.css',
      'comum/componentes/modal_e_aviso.css',
      'licencas/licencas.css'
    ],
    layout: ['comum/layout/menu_lateral.css', 'comum/layout/conteudo.css', 'comum/layout/grades.css'],
    login: ['login/login.css']
  },

  /** Fonte + CSS que todas as telas usam. */
  base() {
    document.head.append(TI.dom.el('link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap'
    }));
    return this.carregar(this.GRUPOS.base);
  },

  /**
   * @param {string|string[]} arquivos  caminhos relativos a css/ (ex.: 'login/login.css')
   * @returns {Promise<void>} resolve quando todos carregaram (ou falharam: a tela abre mesmo assim)
   */
  carregar(arquivos) {
    return Promise.all([].concat(arquivos || []).map((arq) => {
      if (!this._mapa.has(arq)) {
        this._mapa.set(arq, new Promise((resolve) => {
          const link = TI.dom.el('link', { rel: 'stylesheet', href: 'css/' + arq });
          link.addEventListener('load', resolve);
          link.addEventListener('error', () => { console.warn('[TI] CSS não encontrado: css/' + arq); resolve(); });
          setTimeout(resolve, 4000);   // nunca trava a tela esperando um arquivo
          document.head.append(link);
        }));
      }
      return this._mapa.get(arq);
    })).then(() => undefined);
  }
};
