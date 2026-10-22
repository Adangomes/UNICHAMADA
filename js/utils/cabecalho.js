/**
 * cabecalho.js — cabeçalho reutilizado pelo painel do coordenador e do professor.
 */

function montarCabecalhoPainel(sessao, tipo) {
  // Trata tanto { tipo, dados: {...} } quanto o objeto do usuário direto
  const dados = (sessao && sessao.dados) ? sessao.dados : (sessao || {});

  const nome = dados.nome || 'Usuário';
  const ra = dados.ra || '—';

  const foto = dados.fotoRosto
    ? criarElemento('img', { class: 'foto-mini', src: dados.fotoRosto, alt: `Foto de ${nome}` })
    : criarElemento('div', { class: 'avatar-inicial' }, [iniciaisDoNome(nome)]);

  const rotuloTipo = tipo === 'coordenador' ? 'Coordenador(a)' : 'Professor(a)';

  const identidade = criarElemento('div', { class: 'identidade' }, [
    foto,
    criarElemento('div', { class: 'textos' }, [
      criarElemento('strong', {}, [nome]),
      criarElemento('span', {}, [`${rotuloTipo} · RA ${ra}`])
    ])
  ]);

  const btnSair = criarElemento('button', {
    class: 'btn-sair',
    onClick: async () => {
      try {
        await encerrarSessao();
        window.location.reload();
      } catch (erro) {
        console.error('Não foi possível encerrar a sessão:', erro);
        mostrarToast('Não foi possível encerrar a sessão. Confira a conexão.', 'erro');
      }
    }
  }, ['Sair']);

  return criarElemento('header', { class: 'painel-header' }, [identidade, btnSair]);
}

window.montarCabecalhoPainel = montarCabecalhoPainel;
