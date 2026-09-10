/**
 * geolocalizacao.js
 * ------------------------------------------------------------------
 * Valida se o aluno está a menos de 100 metros do local onde a chamada foi gerada.
 * ------------------------------------------------------------------
 */

const RAIO_PERMITIDO_METROS = 100;

/** Distância em metros entre duas coordenadas (fórmula de Haversine). */
function distanciaEmMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000; // raio da Terra em metros
  const toRad = (graus) => (graus * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Pega as coordenadas atuais do dispositivo (use esta função quando o professor GERAR a chamada).
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
function obterLocalizacaoAtual() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('Seu navegador não suporta geolocalização.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        resolve({
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude
        });
      },
      (erro) => {
        const mensagens = {
          1: 'Permissão de localização negada.',
          2: 'Não foi possível obter sua localização atual.',
          3: 'Tempo esgotado ao buscar localização.'
        };
        reject(mensagens[erro.code] || 'Erro de geolocalização.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/**
 * Valida a distância do ALUNO em relação às coordenadas salvas na chamada do professor.
 * @param {number} latProfessor - Latitude capturada ao abrir a chamada
 * @param {number} lonProfessor - Longitude capturada ao abrir a chamada
 * @returns {Promise<{permitido:boolean, distancia:number|null, erro:string|null}>}
 */
function verificarLocalizacaoAluno(latProfessor, lonProfessor) {
  return new Promise((resolve) => {
    if (!latProfessor || !lonProfessor) {
      resolve({ permitido: false, distancia: null, erro: 'Coordenadas da chamada inválidas ou ausentes.' });
      return;
    }

    obterLocalizacaoAtual()
      .then((coordsAluno) => {
        const distancia = distanciaEmMetros(
          coordsAluno.latitude,
          coordsAluno.longitude,
          latProfessor,
          lonProfessor
        );

        resolve({
          permitido: distancia <= RAIO_PERMITIDO_METROS,
          distancia: Math.round(distancia),
          erro: null
        });
      })
      .catch((erroMsg) => {
        resolve({ permitido: false, distancia: null, erro: erroMsg });
      });
  });
}

window.RAIO_PERMITIDO_METROS = RAIO_PERMITIDO_METROS;
window.obterLocalizacaoAtual = obterLocalizacaoAtual;
window.verificarLocalizacaoAluno = verificarLocalizacaoAluno;
