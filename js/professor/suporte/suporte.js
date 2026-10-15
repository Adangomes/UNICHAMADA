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

  if ((tipo !== 'professor' && tipo !== 'coordenador') || !usuario.id) {
    container.replaceChildren(S.erroBloco('Não foi possível abrir o Suporte: faltam dados de quem está logado.'));
    return;
  }

  await S.carregarCss();

  const raiz = S.el('section', { class: 'su-raiz' });
  container.replaceChildren(raiz);

  // estado compartilhado entre as telas da aba
  const e = { tipo, id: usuario.id, opcoes };
  e.mostrarLista = () => S.lista.render(raiz, e);
  e.abrirDetalhe = (codigo) => S.detalhe.render(raiz, e, codigo);
  e.abrirNovo = () => S.novoChamado.abrir(e, () => e.mostrarLista());

  await e.mostrarLista();
};
