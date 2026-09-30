/**
 * camera.js — captura da "foto do rosto" do aluno.
 * Permite tirar foto na hora (getUserMedia) ou carregar da galeria (input file).
 * O resultado final é sempre salvo como dataURL (base64) no campo fotoRosto.
 */

let streamAtivo = null;

/**
 * Monta o bloco de captura de foto dentro de um formulário.
 * @param {HTMLElement} container - elemento onde o bloco será inserido
 * @param {string} valorInicial - dataURL já existente (edição) ou ''
 * @param {(dataUrl:string)=>void} aoMudarFoto - callback disparado ao definir/trocar a foto
 */
function montarCapturaFoto(container, valorInicial, aoMudarFoto) {
  container.innerHTML = '';

  const preview = criarElemento('img', {
    class: 'pre-visualizacao',
    src: valorInicial || iconePadraoFoto(),
    alt: 'Pré-visualização da foto do rosto'
  });

  const inputGaleria = criarElemento('input', {
    type: 'file',
    accept: 'image/*',
    class: 'oculto'
  });

  inputGaleria.addEventListener('change', (evento) => {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      preview.src = leitor.result;
      aoMudarFoto(leitor.result);
    };
    leitor.readAsDataURL(arquivo);
  });

  const btnGaleria = criarElemento(
    'button',
    { type: 'button', class: 'btn-secundario', onClick: () => inputGaleria.click() },
    ['Carregar da galeria']
  );

  const btnCamera = criarElemento(
    'button',
    {
      type: 'button',
      class: 'btn-secundario',
      onClick: () => abrirModalCamera((dataUrl) => {
        preview.src = dataUrl;
        aoMudarFoto(dataUrl);
      })
    },
    ['Tirar foto agora']
  );

  const grupoBotoes = criarElemento('div', { class: 'grupo-btn' }, [btnCamera, btnGaleria]);
  const acoes = criarElemento('div', { class: 'acoes-foto' }, [grupoBotoes, inputGaleria]);
  const bloco = criarElemento('div', { class: 'captura-foto' }, [preview, acoes]);

  container.appendChild(bloco);
}

function iconePadraoFoto() {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#F6F4EE"/>
      <circle cx="50" cy="38" r="18" fill="#DAD5C6"/>
      <path d="M18 88 Q50 58 82 88 Z" fill="#DAD5C6"/>
    </svg>
  `);
}

function abrirModalCamera(aoCapturar) {
  const video = criarElemento('video', { autoplay: 'true', playsinline: 'true' });
  const btnCapturar = criarElemento('button', { type: 'button', class: 'btn-primario' }, ['Capturar']);
  const btnCancelar = criarElemento('button', { type: 'button', class: 'btn-secundario' }, ['Cancelar']);
  const botoes = criarElemento('div', { class: 'botoes-camera' }, [btnCapturar, btnCancelar]);
  const cartao = criarElemento('div', { class: 'cartao' }, [video, botoes]);
  const modal = criarElemento('div', { class: 'camera-modal' }, [cartao]);
  document.body.appendChild(modal);

  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: 'user' }, audio: false })
    .then((stream) => {
      streamAtivo = stream;
      video.srcObject = stream;
    })
    .catch(() => {
      mostrarToast('Não foi possível acessar a câmera. Use "Carregar da galeria".', 'erro');
      fecharModalCamera(modal);
    });

  btnCapturar.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 320;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    aoCapturar(dataUrl);
    fecharModalCamera(modal);
  });

  btnCancelar.addEventListener('click', () => fecharModalCamera(modal));
}

function fecharModalCamera(modal) {
  if (streamAtivo) {
    streamAtivo.getTracks().forEach((faixa) => faixa.stop());
    streamAtivo = null;
  }
  modal.remove();
}

window.montarCapturaFoto = montarCapturaFoto;
window.iconePadraoFoto = iconePadraoFoto;
