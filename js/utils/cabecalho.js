/**
 * cabecalho.js — cabeçalho reutilizado pelo painel do coordenador e do professor.
 */

function montarCabecalhoPainel(sessao, tipo) {
  const { dados } = sessao;
  const foto = dados.fotoRosto
    ? criarElemento('img', { class: 'foto-mini', src: dados.fotoRosto, alt: `Foto de ${dados.nome}` })
    : criarElemento('div', { class: 'avatar-inicial' }, [iniciaisDoNome(dados.nome)]);

  const rotuloTipo = tipo === 'coordenador' ? 'Coordenador(a)' : 'Professor(a)';

  const identidade = criarElemento('div', { class: 'identidade' }, [
    foto,
    criarElemento('div', { class: 'textos' }, [
      criarElemento('strong', {}, [dados.nome]),
      criarElemento('span', {}, [`${rotuloTipo} · RA ${dados.ra}`])
    ])
  ]);

  const btnSair = criarElemento('button', {
    class: 'btn-sair',
    onClick: () => {
      encerrarSessao();
      window.location.reload();
    }
  }, ['Sair']);

  return criarElemento('header', { class: 'painel-header' }, [identidade, btnSair]);
}

window.montarCabecalhoPainel = montarCabecalhoPainel;
