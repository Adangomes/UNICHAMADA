/**
 * coordenadores.js — Monta o painel do coordenador dentro de #tela-coordenador,
 * com navegação por abas entre Professores, Cursos, Alunos, Disciplinas,
 * Turmas e Matrículas.
 */

const ABAS_COORDENADOR = [
  { chave: 'professores', rotulo: 'Professores', render: async () => await renderSecaoProfessores(elementoConteudoCoordenador) },
  { chave: 'cursos', rotulo: 'Cursos', render: async () => await renderSecaoCursos(elementoConteudoCoordenador) },
  { chave: 'alunos', rotulo: 'Alunos', render: async () => await renderSecaoAlunos(elementoConteudoCoordenador) },
  { chave: 'disciplinas', rotulo: 'Disciplinas', render: async () => await renderSecaoDisciplinas(elementoConteudoCoordenador) },
  { chave: 'turmas', rotulo: 'Turmas', render: async () => await renderSecaoTurmas(elementoConteudoCoordenador) },
  { chave: 'matriculas', rotulo: 'Matrículas', render: async () => await renderSecaoMatriculas(elementoConteudoCoordenador) }
];

let elementoConteudoCoordenador = null;
let abaAtivaCoordenador = 'professores';

async function montarPainelCoordenador(sessao) {
  const tela = $('#tela-coordenador');
  tela.innerHTML = '';

  tela.appendChild(montarCabecalhoPainel(sessao, 'coordenador'));

  const corpo = criarElemento('div', { class: 'painel-corpo' });
  const nav = criarElemento('nav', { class: 'painel-nav' });
  elementoConteudoCoordenador = criarElemento('section', { class: 'painel-conteudo' });

  ABAS_COORDENADOR.forEach((aba) => {
    const botao = criarElemento('button', {
      class: aba.chave === abaAtivaCoordenador ? 'ativo' : '',
      onClick: () => selecionarAbaCoordenador(aba.chave, nav)
    }, [aba.rotulo]);
    botao.dataset.chave = aba.chave;
    nav.appendChild(botao);
  });

  corpo.append(nav, elementoConteudoCoordenador);
  tela.appendChild(corpo);

  await renderizarAbaAtivaCoordenador();
}

async function selecionarAbaCoordenador(chave, nav) {
  abaAtivaCoordenador = chave;
  $all('button', nav).forEach((btn) => btn.classList.toggle('ativo', btn.dataset.chave === chave));
  await renderizarAbaAtivaCoordenador();
}

async function renderizarAbaAtivaCoordenador() {
  const aba = ABAS_COORDENADOR.find((a) => a.chave === abaAtivaCoordenador);
  if (aba) {
    await aba.render();
  }
}

window.montarPainelCoordenador = montarPainelCoordenador;
