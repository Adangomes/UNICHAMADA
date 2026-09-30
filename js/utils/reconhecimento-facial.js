/**
 * reconhecimento-facial.js
 * ------------------------------------------------------------------
 * PLACEHOLDER. Este projeto é somente front-end e ainda não tem um
 * back-end/IA real para comparar rostos — por isso essa etapa é
 * SIMULADA (fica "processando" por um tempinho e depois aprova, como
 * combinado: "o banco de dados é pra outra hora").
 *
 * Quando o back-end existir, troque o conteúdo da função
 * compararRosto() por uma chamada real, por exemplo:
 *   - enviar fotoCapturada + fotoCadastrada pra uma API com um modelo
 *     de reconhecimento facial (ex.: face-api.js, AWS Rekognition,
 *     Azure Face, um serviço próprio em Python com face_recognition/
 *     dlib, etc.)
 *   - a API responde um score de similaridade; se acima de um limiar,
 *     considera que é a mesma pessoa.
 * A ASSINATURA da função (o que ela recebe e o que devolve) já está
 * pronta pra essa troca, então o resto do sistema não muda.
 * ------------------------------------------------------------------
 */

/**
 * @param {string} fotoCapturada - dataURL da foto tirada na hora da chamada
 * @param {string} fotoCadastrada - dataURL da foto de rosto cadastrada do aluno
 * @returns {Promise<{aprovado:boolean, motivo:string|null}>}
 */
function compararRosto(fotoCapturada, fotoCadastrada) {
  return new Promise((resolve) => {
    if (!fotoCadastrada) {
      resolve({ aprovado: false, motivo: 'Este aluno não tem foto de rosto cadastrada. Procure a coordenação.' });
      return;
    }
    if (!fotoCapturada) {
      resolve({ aprovado: false, motivo: 'Não foi possível capturar sua foto. Tente novamente.' });
      return;
    }

    // Simula o tempo de processamento de um serviço de IA real.
    setTimeout(() => {
      resolve({ aprovado: true, motivo: null });
    }, 1600);
  });
}

window.compararRosto = compararRosto;
