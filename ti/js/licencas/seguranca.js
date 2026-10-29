/**
 * @fileoverview seguranca.js — Módulo de utilitários de segurança e regras de licença
 *
 * Responsável pela geração de chaves seriais únicas, cálculos de expiração
 * e validação de padrões de chave do software UniChamada.
 *
 * @module LicencasSeguranca
 */

(function (window) {
  'use strict';

  /**
   * Gera uma chave serial única e formatada para ativação de software.
   * Padrão gerado: UNI-XXXX-XXXX-XXXX (ex: UNI-K9P2-4M8X-Q1W7)
   *
   * @returns {string} Chave serial em caixa alta e formatada.
   */
  function gerarChaveSerial() {
    const prefixo = 'UNI';
    const blocosDesejados = 3;
    const tamanhoBloco = 4;
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const blocos = [prefixo];

    for (let i = 0; i < blocosDesejados; i++) {
      let bloco = '';
      for (let j = 0; j < tamanhoBloco; j++) {
        // Seleção aleatória via valores criptograficamente seguros se disponível
        if (window.crypto && window.crypto.getRandomValues) {
          const array = new Uint32Array(1);
          window.crypto.getRandomValues(array);
          bloco += caracteres.charAt(array[0] % caracteres.length);
        } else {
          bloco += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
      }
      blocos.push(bloco);
    }

    return blocos.join('-');
  }

  /**
   * Calcula a data ISO de expiração com base no tipo de validade selecionado.
   *
   * @param {string} tipoValidade - 'vitalicia', 'anual' ou 'semestral'
   * @returns {string|null} Data de expiração no formato ISO (ex: "2027-10-29T12:00:00.000Z") ou null se vitalícia.
   */
  function calcularDataExpiracao(tipoValidade) {
    if (!tipoValidade || tipoValidade === 'vitalicia') {
      return null;
    }

    const dataAtual = new Date();

    if (tipoValidade === 'anual') {
      dataAtual.setFullYear(dataAtual.getFullYear() + 1);
      return dataAtual.toISOString();
    }

    if (tipoValidade === 'semestral') {
      dataAtual.setMonth(dataAtual.getMonth() + 6);
      return dataAtual.toISOString();
    }

    return null;
  }

  /**
   * Valida se uma string enviada possui a estrutura válida do padrão de serial do UniChamada.
   *
   * @param {string} chave - A chave a ser validada.
   * @returns {boolean} True se a estrutura do serial for válida.
   */
  function validarEstruturaSerial(chave) {
    if (!chave || typeof chave !== 'string') return false;
    const regexSerial = /^UNI-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    return regexSerial.test(chave.trim());
  }

  // Exportação no escopo global para compatibilidade com a SPA sem bundler
  window.gerarChaveSerial = gerarChaveSerial;
  window.calcularDataExpiracao = calcularDataExpiracao;
  window.validarEstruturaSerial = validarEstruturaSerial;

  window.LicencasSeguranca = {
    gerarChaveSerial,
    calcularDataExpiracao,
    validarEstruturaSerial
  };

})(window);
