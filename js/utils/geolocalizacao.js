/**
 * geolocalizacao.js
 * ------------------------------------------------------------------
 * Verifica se o aluno está fisicamente perto da faculdade (raio em metros)
 * usando a Geolocation API do navegador + fórmula de Haversine.
 *
 * IMPORTANTE: as coordenadas abaixo são aproximadas para o endereço
 * "Av. Getúlio Vargas, 268 - Centro, Jaraguá do Sul - SC" (Unisociesc,
 * dentro do Partage Shopping). Ajuste para o valor exato antes de usar
 * em produção: abra o local no Google Maps, clique com o botão direito
 * bem em cima do prédio e copie as coordenadas que aparecem no menu.
 * ------------------------------------------------------------------
 */

const CAMPUS = {
  nome: 'Unisociesc — Jaraguá do Sul (Av. Getúlio Vargas, 268 - Centro)',
  latitude: -26.4869,
  longitude: -49.0656
};

const RAIO_PERMITIDO_METROS = 500;

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
 * @returns {Promise<{permitido:boolean, distancia:number|null, erro:string|null}>}
 */
function verificarLocalizacao() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ permitido: false, distancia: null, erro: 'Este navegador não suporta geolocalização.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const distancia = distanciaEmMetros(
          posicao.coords.latitude,
          posicao.coords.longitude,
          CAMPUS.latitude,
          CAMPUS.longitude
        );
        resolve({
          permitido: distancia <= RAIO_PERMITIDO_METROS,
          distancia: Math.round(distancia),
          erro: null
        });
      },
      (erro) => {
        const mensagens = {
          1: 'Permissão de localização negada. Ative para confirmar presença.',
          2: 'Não foi possível obter sua localização.',
          3: 'Tempo esgotado ao obter localização. Tente novamente.'
        };
        resolve({ permitido: false, distancia: null, erro: mensagens[erro.code] || 'Erro ao obter localização.' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

window.CAMPUS = CAMPUS;
window.RAIO_PERMITIDO_METROS = RAIO_PERMITIDO_METROS;
window.verificarLocalizacao = verificarLocalizacao;
