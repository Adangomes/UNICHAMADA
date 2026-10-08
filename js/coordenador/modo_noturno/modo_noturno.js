(function () {
  'use strict';

  function aplicarIntensidadeEscuro(valor) {
    const intensidade = valor / 100;
    const r = Math.round(4 * (1 - intensidade));
    const g = Math.round(16 * (1 - intensidade));
    const b = Math.round(22 * (1 - intensidade));
    
    document.documentElement.style.setProperty('--rel-fundo', `rgb(${r}, ${g}, ${b})`);
    document.documentElement.style.setProperty('--un-intensidade-val', valor + '%');
  }

  function inicializarModoNoturno() {
    if (document.getElementById('un-modo-container')) return;

    // Começa padrão escuro sem puxar do localStorage
    const body = document.body;
    body.classList.add('modo-escuro');
    aplicarIntensidadeEscuro(50); // intensidade inicial padrão

    const headerTopo = document.querySelector('.rel-topo, .painel-cabecalho');
    if (!headerTopo) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'un-modo-container';
    wrapper.className = 'un-modo-painel';

    wrapper.innerHTML = `
      <button id="btn-modo-noturno" class="rel-atualizar" type="button" title="Ajustar Modo Noturno">
        <i class="bi bi-moon-stars-fill"></i>
      </button>
      <div id="un-modo-menu" class="un-modo-menu">
        <p class="un-modo-titulo">Intensidade do Escuro</p>
        <div class="un-modo-slider-grupo">
          <input type="range" id="un-slider-intensidade" class="un-modo-slider" min="0" max="100" value="50">
          <div class="un-modo-info">
            <span>Suave</span>
            <span id="un-valor-txt">50%</span>
            <span>OLED</span>
          </div>
        </div>
      </div>
    `;

    const grupoStatus = headerTopo.querySelector('.rel-status-grupo') || headerTopo;
    grupoStatus.appendChild(wrapper);

    const btnToggle = wrapper.querySelector('#btn-modo-noturno');
    const menuPopup = wrapper.querySelector('#un-modo-menu');
    const slider = wrapper.querySelector('#un-slider-intensidade');
    const txtValor = wrapper.querySelector('#un-valor-txt');

    btnToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      menuPopup.classList.toggle('ativo');
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        menuPopup.classList.remove('ativo');
      }
    });

    slider.addEventListener('input', (e) => {
      const val = e.target.value;
      txtValor.textContent = val + '%';
      
      body.classList.add('modo-escuro');
      body.classList.remove('modo-claro');
      
      aplicarIntensidadeEscuro(Number(val));
    });
  }

  window.ModoNoturno = { inicializar: inicializarModoNoturno };
})();
