/**
 * cabecalho.js — cabeçalho reutilizado pelo painel do coordenador e do professor.
 * Mostra só a foto (ou iniciais) e o nome. O RA não aparece na tela.
 *
 * Funções usadas aqui que NÃO são deste arquivo (vêm de outros scripts, que o
 * index.html carrega antes deste):
 *   - criarElemento(tag, atributos, filhos)  -> cria um elemento HTML pronto
 *   - iniciaisDoNome(nome)                   -> devolve as letras iniciais ("Ana Paula" -> "AP")
 *   - encerrarSessao()                       -> apaga o login guardado (js/auth/auth.js)
 */

// Monta e devolve o <header> do painel.
// Parâmetros:
//   sessao -> quem está logado (pode vir como { tipo, dados: {...} } ou só o objeto da pessoa)
//   tipo   -> 'coordenador' ou 'professor'. Hoje não é mais usado aqui (antes servia para
//             escrever "Coordenador(a)" / "Professor(a)"), mas o parâmetro fica para não
//             quebrar quem chama esta função.
function montarCabecalhoPainel(sessao, tipo) {

  // Descobre onde estão os dados da pessoa:
  //  - se a sessão tem a chave "dados", usa ela ({ tipo, dados: {...} });
  //  - senão, usa a própria sessão (objeto da pessoa direto);
  //  - se não veio nada, usa um objeto vazio para não dar erro nas linhas abaixo.
  const dados = (sessao && sessao.dados) ? sessao.dados : (sessao || {});

  // Nome que vai aparecer na tela. Se a pessoa não tiver nome, mostra "Usuário".
  const nome = dados.nome || 'Usuário';

  // Foto da pessoa:
  //  - se existe fotoRosto, cria uma <img> pequena com a foto (o "alt" é o texto
  //    lido por leitores de tela e mostrado se a imagem falhar);
  //  - se não existe, cria um círculo (<div>) com as iniciais do nome.
  const foto = dados.fotoRosto
    ? criarElemento('img', { class: 'foto-mini', src: dados.fotoRosto, alt: `Foto de ${nome}` })
    : criarElemento('div', { class: 'avatar-inicial' }, [iniciaisDoNome(nome)]);

  // Bloco da esquerda do cabeçalho: foto + nome.
  const identidade = criarElemento('div', { class: 'identidade' }, [
    foto,                                                  // a foto (ou as iniciais)
    criarElemento('div', { class: 'textos' }, [            // caixinha que guarda os textos
      criarElemento('strong', {}, [nome])                  // o nome, em negrito
    ])
  ]);

  // Botão "Sair" (lado direito do cabeçalho).
  const btnSair = criarElemento('button', {
    class: 'btn-sair',
    // Quando clicar:
    onClick: () => {
      encerrarSessao();            // 1) apaga o login guardado no navegador
      window.location.reload();    // 2) recarrega a página, que volta para a tela de login
    }
  }, ['Sair']);                    // texto escrito dentro do botão

  // Junta tudo no <header>: identidade à esquerda, botão Sair à direita, e devolve.
  return criarElemento('header', { class: 'painel-header' }, [identidade, btnSair]);
}

// Deixa a função disponível para os outros arquivos (coordenador.js, professor.js...),
// pois todos os scripts compartilham o objeto "window".
window.montarCabecalhoPainel = montarCabecalhoPainel;
