(function () {
  'use strict';

  function alternarModoNoturno() {
    const body = document.body;
    const ehEscuro = body.classList.toggle('modo-escuro');
    body.classList.toggle('modo-claro', !ehEscuro);
    
    // Salva a preferência do usuário no navegador
    localStorage.setItem('unichamada_tema', ehEscuro ? 'escuro' : 'claro');
  }

  function inicializarModoNoturno() {
    const temaSalvo = localStorage.getItem('unichamada_tema') || 'escuro';
    document.body.classList.add(temaSalvo === 'escuro' ? 'modo-escuro' : 'modo-claro');

    // Cria o botão dinamicamente no cabeçalho se ele não existir
    const headerTopo = document.querySelector('.painel-cabecalho, .rel-topo');
    if (headerTopo && !document.getElementById('btn-modo-noturno')) {
      const btn = document.createElement('button');
      btn.id = 'btn-modo-noturno';
      btn.className = 'rel-atualizar'; // Reaproveita o estilo de botão circular elegante
      btn.title = 'Alternar Modo Escuro / Claro';
      btn.innerHTML = '<i class="bi bi-moon-stars-fill"></i>';
      
      btn.addEventListener('click', alternarModoNoturno);
      headerTopo.appendChild(btn);
    }
  }

  window.ModoNoturno = { inicializar: inicializarModoNoturno };
})();
