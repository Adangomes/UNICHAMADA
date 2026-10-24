/**
 * coordenador.js
 * 
 * Painel do coordenador. Monta a tela com abas (Professores, Cursos, Alunos,
 * Disciplinas, Turmas, Matrículas, Notificações, Chat) dentro de #tela-coordenador.
 */

// Configuração das abas do painel. Cada aba tem uma chave (id interno),
// o rótulo que aparece no botão e a função que renderiza o conteúdo dela.
// Se precisar adicionar uma aba nova, é só incluir aqui.
const ABAS_COORDENADOR = [
  { chave: 'professores', rotulo: 'Professores', grupo: 'Cadastros', render: async () => await renderSecaoProfessores(elementoConteudoCoordenador) },
  { chave: 'cursos', rotulo: 'Cursos', grupo: 'Cadastros', render: async () => await renderSecaoCursos(elementoConteudoCoordenador) },
  { chave: 'alunos', rotulo: 'Alunos', grupo: 'Cadastros', render: async () => await renderSecaoAlunos(elementoConteudoCoordenador) },
  { chave: 'disciplinas', rotulo: 'Disciplinas', grupo: 'Cadastros', render: async () => await renderSecaoDisciplinas(elementoConteudoCoordenador) },
  { chave: 'turmas', rotulo: 'Turmas', grupo: 'Cadastros', render: async () => await renderSecaoTurmas(elementoConteudoCoordenador) },
  { chave: 'matriculas', rotulo: 'Matrículas', grupo: 'Cadastros', render: async () => await renderSecaoMatriculas(elementoConteudoCoordenador) },
  { chave: 'notificacoes', rotulo: 'Notificações', render: async () => await renderSecaoNotificacoes(elementoConteudoCoordenador) },
  {
    // Chat com os professores (js/coordenador/chat/chat.js)
    chave: 'chat',
    rotulo: 'Chat',
    render: async () => {
      elementoConteudoCoordenador.innerHTML = '<div id="chat-coordenador-root"></div>';
      const usuario = sessaoCoordenador?.dados;
      if (!usuario?.id) throw new Error('Não foi possível identificar o coordenador da sessão.');
      await window.iniciarChatCoordenador('chat-coordenador-root', usuario);
    }
  },
  {
    // Dashboard de relatórios (js/relatorios/relatorios.js)
    chave: 'relatorios',
    rotulo: 'Relatórios',
    render: async () => await window.renderRelatorios(elementoConteudoCoordenador, 'coordenador')
  },
  {
    chave: 'suporte',
    rotulo: 'Suporte',
    render: async () => {
      elementoConteudoCoordenador.innerHTML = '';
      const usuario = sessaoCoordenador?.dados;
      if (!usuario?.id) throw new Error('Não foi possível identificar o coordenador da sessão.');

      await window.montarSuporte(elementoConteudoCoordenador, {
        tipo: 'coordenador', 
        usuario,
        tela: 'Painel do coordenador' 
      });
    }
  }
];

// ( ba48d258-b46f-4bc6-9ae0-5daaa396 )Guarda a referência do container onde o conteúdo da aba atual é desenhado.
// É preenchido lá no montarPainelCoordenador() e usado pelas funções de render.
let elementoConteudoCoordenador = null;

let sessaoCoordenador = null;

// Qual aba tá ativa no momento. Começa em 'professores' por padrão.
let abaAtivaCoordenador = 'professores';

/**
 * Monta o painel inteiro do coordenador do zero: limpa a tela, coloca o
 * cabeçalho, cria os botões de navegação e o container de conteúdo, e já
 * renderiza a aba inicial.
 */
async function montarPainelCoordenador(sessao) {
  sessaoCoordenador = sessao;
  const tela = $('#tela-coordenador');

  // Limpa qualquer conteúdo anterior antes de remontar o painel
  // (evita duplicar elemento quando a função é chamada de novo, tipo ao trocar de perfil)
  tela.innerHTML = '';

  // Cabeçalho padrão, reaproveitado pelos outros painéis (aluno, professor etc).
  // Passa 'coordenador' pra ele saber qual variação exibir.
  tela.appendChild(montarCabecalhoPainel(sessao, 'coordenador'));

  // Estrutura base do corpo do painel: nav (menu de abas) + conteúdo
  const corpo = criarElemento('div', { class: 'painel-corpo' });
  const nav = criarElemento('nav', { class: 'painel-nav' });
  elementoConteudoCoordenador = criarElemento('section', { class: 'painel-conteudo' });

  // Percorre a lista de abas e cria um botão pra cada uma.
  // O botão já nasce marcado como "ativo" se for a aba atual (importante
  // pro caso de recarregar o painel mantendo a aba que o usuário tava vendo).
  const gruposNav = new Map();
  ABAS_COORDENADOR.forEach((aba) => {
    const botao = criarElemento('button', {
      class: aba.chave === abaAtivaCoordenador ? 'ativo' : '',
      onClick: () => selecionarAbaCoordenador(aba.chave, nav)
    }, [aba.rotulo]);

    // Guarda a chave da aba no próprio botão (via data-attribute) pra
    // conseguir identificar ele depois, sem precisar de closures complicadas
    botao.dataset.chave = aba.chave;

    if (!aba.grupo) {
      nav.appendChild(botao);
      return;
    }

    let grupo = gruposNav.get(aba.grupo);
    if (!grupo) {
      const submenuId = `menu-${aba.grupo.toLowerCase()}`;
      const submenu = criarElemento('div', {
        id: submenuId,
        class: 'painel-nav-submenu'
      });
      submenu.hidden = true;

      const toggle = criarElemento('button', {
        type: 'button',
        'aria-expanded': 'false',
        'aria-controls': submenuId,
        onClick: () => {
          submenu.hidden = !submenu.hidden;
          toggle.setAttribute('aria-expanded', String(!submenu.hidden));
          atualizarNavegacaoCoordenador(nav);
        }
      }, [aba.grupo]);

      grupo = criarElemento('div', { class: 'painel-nav-grupo' }, [toggle, submenu]);
      grupo.submenu = submenu;
      gruposNav.set(aba.grupo, grupo);
      nav.appendChild(grupo);
    }
    grupo.submenu.appendChild(botao);
  });

  // Junta nav + conteúdo no corpo, e o corpo na tela
  corpo.append(nav, elementoConteudoCoordenador);
  tela.appendChild(corpo);

  atualizarNavegacaoCoordenador(nav);

  // Assim que monta o painel, já renderiza o conteúdo da aba ativa
  await renderizarAbaAtivaCoordenador();
}

function atualizarNavegacaoCoordenador(nav) {
  $all('button[data-chave]', nav).forEach((botao) => {
    botao.classList.toggle('ativo', botao.dataset.chave === abaAtivaCoordenador);
  });

  const toggleCadastros = nav.querySelector('button[aria-controls="menu-cadastros"]');
  if (toggleCadastros) {
    const menuExpandido = toggleCadastros.getAttribute('aria-expanded') === 'true';
    const cadastroAtivo = ABAS_COORDENADOR.some(
      (aba) => aba.grupo === 'Cadastros' && aba.chave === abaAtivaCoordenador
    );
    toggleCadastros.classList.toggle('ativo', cadastroAtivo && !menuExpandido);
  }
}

/**
 * Troca a aba ativa: atualiza qual botão fica marcado como "ativo" e
 * renderiza o conteúdo correspondente.
 */
async function selecionarAbaCoordenador(chave, nav) {
  // Atualiza a variável global de controle pra nova aba clicada
  abaAtivaCoordenador = chave;

  const abaSelecionada = ABAS_COORDENADOR.find((aba) => aba.chave === chave);
  const toggleCadastros = nav.querySelector('button[aria-controls="menu-cadastros"]');
  if (toggleCadastros) {
    const expandido = abaSelecionada?.grupo === 'Cadastros';
    const submenu = nav.querySelector(`#${toggleCadastros.getAttribute('aria-controls')}`);
    submenu.hidden = !expandido;
    toggleCadastros.setAttribute('aria-expanded', String(expandido));
  }
  atualizarNavegacaoCoordenador(nav);

  // Renderiza o conteúdo da aba que acabou de ser selecionada
  await renderizarAbaAtivaCoordenador();
}

/**
 * Pega a aba ativa na lista ABAS_COORDENADOR e chama a função de render dela.
 */
async function renderizarAbaAtivaCoordenador() {
  // Desliga o tempo real do chat ao sair da aba Chat (evita conexão aberta à toa)
  if (window.ChatDados) window.ChatDados.cancelar();
  if (abaAtivaCoordenador !== 'relatorios' && window.Relatorios) {
    window.Relatorios.parar();
  }

  // Procura na lista de abas qual delas corresponde à chave ativa no momento
  const aba = ABAS_COORDENADOR.find((a) => a.chave === abaAtivaCoordenador);

  // Só renderiza se encontrou (proteção básica, caso a chave esteja errada
  // ou a aba tenha sido removida da lista por engano)
  if (aba) {
    try {
      await aba.render();
    } catch (erro) {
      console.error(`Falha ao abrir a aba "${aba.rotulo}":`, erro);
      elementoConteudoCoordenador.replaceChildren(
        criarElemento('div', { class: 'estado-vazio', role: 'alert' }, [
          `Não foi possível abrir ${aba.rotulo}. ${erro.message || 'Verifique a conexão e tente novamente.'}`
        ])
      );
    }
  }
}

// Expõe a função no escopo global pra poder ser chamada de outros arquivos
// (ex: pelo roteador que decide qual painel montar de acordo com o login)
window.montarPainelCoordenador = montarPainelCoordenador;
