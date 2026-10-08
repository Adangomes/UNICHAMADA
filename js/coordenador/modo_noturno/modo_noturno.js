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

    const body = document.body;
    body.classList.add('modo-escuro');
    aplicarIntensidadeEscuro(50);

    const botoes = Array.from(document.querySelectorAll('button, a'));
    const btnSair = botoes.find(b => b.textContent.trim().toLowerCase() === 'sair');

    if (!btnSair || !btnSair.parentNode) {
      console.warn('ModoNoturno: Botão Sair não foi encontrado.');
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'un-modo-container';
    wrapper.className = 'un-modo-painel';
    wrapper.style.display = 'inline-block';
    wrapper.style.position = 'relative';
    wrapper.style.marginRight = '8px';

    wrapper.innerHTML = `
      <button id="btn-modo-noturno" class="rel-atualizar" type="button" title="Ajustar Modo Noturno" style="width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #fff; cursor: pointer;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-mask" viewBox="0 0 16 16">  
          <path d="M6.225 1.227A7.5 7.5 0 0 1 10.5 8a7.5 7.5 0 0 1-4.275 6.773 7 7 0 1 0 0-13.546M4.187.966a8 8 0 1 1 7.627 14.069A8 8 0 0 1 4.186.964z"/>
        </svg>
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

    btnSair.parentNode.insertBefore(wrapper, btnSair);

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
