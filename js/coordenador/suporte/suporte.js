/**
 * suporte.js — ENTRADA da aba Suporte (carregue por último). Serve para professor e coordenador: é a mesma tela.
 *
 * Como usar, dentro da aba do painel:
 *   await montarSuporte(container, { tipo: 'professor', usuario: professorLogado, tela: 'Painel do professor' });
 *   await montarSuporte(container, { tipo: 'coordenador', usuario: coordenadorLogado, tela: 'Painel do coordenador' });
 *
 *   tipo     'professor' ou 'coordenador'
 *   usuario  o objeto de quem está logado (precisa ter .id)
 *   tela     (opcional) nome da tela, que vai junto no chamado para ajudar a equipe de TI
 */
window.montarSuporte = async function (container, opcoes) {
  const S = window.Suporte;
  opcoes = opcoes || {};
  const tipo = opcoes.tipo;
  const usuario = opcoes.usuario || {};

  // Validação de segurança para evitar o erro de "dados faltando"
  if ((tipo !== 'professor' && tipo !== 'coordenador') || !usuario.id) {
    // Tenta carregar o erro de forma segura
    try {
      container.replaceChildren(S.erroBloco('Não foi possível abrir o Suporte: faltam dados de quem está logado.'));
    } catch (e) {
      container.innerHTML = '<div style="color:red; padding:20px;">Erro ao carregar suporte. Verifique sua sessão.</div>';
    }
    return;
  }

  try {
    // Carrega o CSS necessário para a aba de suporte
    if (S.carregarCss) {
      await S.carregarCss();
    }
  } catch (e) {
    console.warn('Aviso: Não foi possível carregar o CSS do suporte, mas a página será exibida.');
  }

  // Cria a estrutura principal da página
  const raiz = S.el('section', { class: 'su-raiz' });
  container.replaceChildren(raiz);

  // Estado compartilhado entre as telas da aba (Lista, Detalhe, Novo Chamado)
  const e = { 
    tipo: tipo, 
    id: usuario.id, 
    opcoes: opcoes 
  };

  // Funções de navegação interna da aba
  e.mostrarLista = async () => {
    try {
      await S.lista.render(raiz, e);
    } catch (err) {
      raiz.innerHTML = '<div style="color:red; padding:20px;">Erro ao carregar lista de chamados.</div>';
    }
  };

  e.abrirDetalhe = async (codigo) => {
    try {
      await S.detalhe.render(raiz, e, codigo);
    } catch (err) {
      raiz.innerHTML = '<div style="color:red; padding:20px;">Erro ao abrir detalhes do chamado.</div>';
    }
  };

  e.abrirNovo = async () => {
    try {
      await S.novoChamado.abrir(e, () => e.mostrarLista());
    } catch (err) {
      raiz.innerHTML = '<div style="color:red; padding:20px;">Erro ao abrir formulário de chamado.</div>';
    }
  };

  // Inicia a aba mostrando a lista de chamados
  await e.mostrarLista();
};
