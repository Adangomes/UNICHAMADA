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

    // Começa no modo escuro com intensidade padrão de 50% (sem localStorage)
    const body = document.body;
    body.classList.add('modo-escuro');
    aplicarIntensidadeEscuro(50);

    // Procura o botão "Sair" no cabeçalho para colocar o ícone do lado dele
    const botoesCabecalho = Array.from(document.querySelectorAll('header button, .painel-cabecalho button, button'));
    const btnSair = botoesCabecalho.find(b => b.textContent.trim().toLowerCase() === 'sair');
    
    if (!btnSair || !btnSair.parentNode) return;

    // Cria o container do botão de modo noturno e do menu deslizante
    const wrapper = document.createElement('div');
    wrapper.id = 'un-modo-container';
    wrapper.className = 'un-modo-painel';
    wrapper.style.display = 'inline-block';
    wrapper.style.position = 'relative';
    wrapper.style.marginLeft = '8px'; // Espaçamento elegante do botão Sair

    wrapper.innerHTML = `
      <button id="btn-modo-noturno" class="rel-atualizar" type="button" title="Ajustar Modo Noturno" style="width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #fff; cursor: pointer;">
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

    // Insere exatamente antes do botão "Sair"
    btnSair.parentNode.insertBefore(wrapper, btnSair);

    const btnToggle = wrapper.querySelector('#btn-modo-noturno');
    const menuPopup = wrapper.querySelector('#un-modo-menu');
    const slider = wrapper.querySelector('#un-slider-intensidade');
    const txtValor = wrapper.querySelector('#un-valor-txt');

    // Abre/fecha a caixinha com o slider ao clicar no ícone da lua
    btnToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      menuPopup.classList.toggle('ativo');
    });

    // Fecha a caixinha se clicar fora
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        menuPopup.classList.remove('ativo');
      }
    });

    // Altera a intensidade em tempo real ao arrastar a barra
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
