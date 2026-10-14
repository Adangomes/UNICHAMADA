/**
 * formatar.js — datas, prazos (SLA) e iniciais.
 */
window.TI = window.TI || {};

TI.fmt = {
  iniciais(nome) {
    const partes = String(nome || '?').trim().split(/\s+/);
    return ((partes[0] || '?')[0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
  },
  primeiroNome(nome) { return String(nome || '').trim().split(/\s+/)[0] || ''; },

  dataHora(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  },
  dataHoraCompleta(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  hojeExtenso() {
    const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  },

  /** "há 2h 10min", "há 3 dias" */
  idade(iso) {
    if (!iso) return '';
    const min = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000));
    if (min < 60) return 'há ' + min + ' min';
    const h = Math.floor(min / 60);
    if (h < 24) return 'há ' + h + 'h ' + String(min % 60).padStart(2, '0') + 'min';
    return 'há ' + Math.floor(h / 24) + ' dia(s)';
  },

  /** Devolve { texto, urgente } — urgente = vencido ou vence em menos de 3 horas. */
  prazo(iso) {
    if (!iso) return { texto: 'sem prazo', urgente: false };
    const ms = new Date(iso) - Date.now();
    const min = Math.floor(Math.abs(ms) / 60000);
    const h = Math.floor(min / 60);
    const m = min % 60;
    const quanto = h >= 48 ? Math.floor(h / 24) + ' dias' : (h > 0 ? h + 'h ' + String(m).padStart(2, '0') + 'min' : m + ' min');
    if (ms < 0) return { texto: 'venceu há ' + quanto, urgente: true };
    return { texto: 'vence em ' + quanto, urgente: ms < 3 * 3600 * 1000 };
  },

  /** Quanto do prazo já passou, de 0 a 100 (para a barra do SLA). */
  progressoPrazo(criadoEm, prazoEm) {
    if (!criadoEm || !prazoEm) return 0;
    const total = new Date(prazoEm) - new Date(criadoEm);
    if (total <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round(((Date.now() - new Date(criadoEm)) / total) * 100)));
  },

  ehHoje(iso) {
    if (!iso) return false;
    const d = new Date(iso), h = new Date();
    return d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth() && d.getDate() === h.getDate();
  },
  horasEntre(a, b) { return (new Date(b) - new Date(a)) / 3600000; }
};
