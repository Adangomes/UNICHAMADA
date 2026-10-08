/* =========================================================
   UniChamada - Relatórios: globo animado ao fundo do dashboard
   Planeta de pontos girando, com rotas de luz ligando regiões.
   Só usa <canvas> (sem biblioteca externa). Cores verde-água do dashboard.
   Uso: const g = Globo.iniciar(canvas);  ...  g.parar();
   Respeita "reduzir movimento" do sistema (desenha uma imagem parada).
   ========================================================= */
(function () {
  'use strict';
  if (window.Globo) return;

  const COR_PONTO = '94, 234, 212';     // verde-água
  const COR_TERRA = '45, 212, 191';
  const COR_ARCO = '125, 211, 252';     // azul claro
  const TILT = 0.38;                    // inclinação do planeta
  const TOTAL_PONTOS = 1400;
  const TOTAL_ARCOS = 14;

  function iniciar(canvas) {
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return { parar() {} };

    const reduzir = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let largura = 0, altura = 0, rodando = true, angulo = 0.6, observador = null;

    // ---- pontos distribuídos igualmente na esfera (espiral de Fibonacci) ----
    const pontos = [];
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < TOTAL_PONTOS; i++) {
      const y = 1 - (i / (TOTAL_PONTOS - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = phi * i;
      const x = Math.cos(t) * r, z = Math.sin(t) * r;
      // "continentes" estilizados: manchas onde a soma de ondas passa de um limite
      const terra = Math.sin(x * 3.1 + 1.3) + Math.sin(y * 4.2 + 0.7) + Math.sin(z * 3.7 - 0.4)
                    + 0.5 * Math.sin((x + y + z) * 5.5) > 0.55;
      pontos.push({ x, y, z, terra });
    }
    const terras = pontos.filter((p) => p.terra);

    // ---- rotas de luz entre dois pontos de "terra" ----
    function novoArco() {
      let a, b, omega;
      do {
        a = terras[Math.floor(Math.random() * terras.length)];
        b = terras[Math.floor(Math.random() * terras.length)];
        omega = Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z)));
      } while (omega < 0.6 || omega > 2.4);
      return { a, b, omega, t: Math.random(), v: 0.0035 + Math.random() * 0.005 };
    }
    const arcos = [];
    for (let i = 0; i < TOTAL_ARCOS; i++) arcos.push(novoArco());

    // ---- geometria ----
    function girar(x, y, z) {
      const c = Math.cos(angulo), s = Math.sin(angulo);
      const X = x * c + z * s, Z = -x * s + z * c;
      const ct = Math.cos(TILT), st = Math.sin(TILT);
      return [X, y * ct - Z * st, y * st + Z * ct];
    }

    function ajustar() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      largura = canvas.clientWidth || 600;
      altura = canvas.clientHeight || 400;
      canvas.width = Math.round(largura * dpr);
      canvas.height = Math.round(altura * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduzir) desenhar();
    }

    function desenhar() {
      ctx.clearRect(0, 0, largura, altura);
      const cx = largura * 0.5, cy = altura * 0.5;
      const R = Math.min(largura, altura) * 0.42;

      // brilho atrás do planeta
      const halo = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.35);
      halo.addColorStop(0, `rgba(${COR_TERRA}, 0.16)`);
      halo.addColorStop(1, `rgba(${COR_TERRA}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2); ctx.fill();

      // borda do planeta
      ctx.strokeStyle = `rgba(${COR_PONTO}, 0.22)`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

      // pontos (só o hemisfério voltado para nós)
      for (const p of pontos) {
        const [X, Y, Z] = girar(p.x, p.y, p.z);
        if (Z <= 0) continue;
        const alfa = (p.terra ? 0.35 : 0.12) + Z * (p.terra ? 0.55 : 0.25);
        ctx.fillStyle = `rgba(${p.terra ? COR_TERRA : COR_PONTO}, ${alfa.toFixed(3)})`;
        const tam = (p.terra ? 1.5 : 1) + Z * 0.7;
        ctx.fillRect(cx + X * R - tam / 2, cy - Y * R - tam / 2, tam, tam);
      }

      // rotas de luz
      for (const arco of arcos) {
        const { a, b, omega } = arco;
        const so = Math.sin(omega);
        let anterior = null;
        for (let i = 0; i <= 28; i++) {
          const t = i / 28;
          const ka = Math.sin((1 - t) * omega) / so, kb = Math.sin(t * omega) / so;
          const lift = 1 + 0.2 * Math.sin(Math.PI * t);
          const [X, Y, Z] = girar((a.x * ka + b.x * kb) * lift, (a.y * ka + b.y * kb) * lift, (a.z * ka + b.z * kb) * lift);
          const atual = Z > 0 ? [cx + X * R, cy - Y * R] : null;
          if (anterior && atual) {
            ctx.strokeStyle = `rgba(${COR_ARCO}, 0.28)`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(anterior[0], anterior[1]); ctx.lineTo(atual[0], atual[1]); ctx.stroke();
          }
          anterior = atual;
        }
        // "pulso" viajando pela rota
        const ta = arco.t;
        const ka = Math.sin((1 - ta) * omega) / so, kb = Math.sin(ta * omega) / so;
        const lift = 1 + 0.2 * Math.sin(Math.PI * ta);
        const [X, Y, Z] = girar((a.x * ka + b.x * kb) * lift, (a.y * ka + b.y * kb) * lift, (a.z * ka + b.z * kb) * lift);
        if (Z > 0) {
          const px = cx + X * R, py = cy - Y * R;
          const brilho = ctx.createRadialGradient(px, py, 0, px, py, 9);
          brilho.addColorStop(0, `rgba(${COR_ARCO}, 0.95)`);
          brilho.addColorStop(1, `rgba(${COR_ARCO}, 0)`);
          ctx.fillStyle = brilho;
          ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    function quadro() {
      if (!rodando) return;
      if (canvas.isConnected === false) { rodando = false; return; }   // saiu da tela: para sozinho
      if (!document.hidden) {
        angulo += 0.0016;
        for (const arco of arcos) {
          arco.t += arco.v;
          if (arco.t > 1) Object.assign(arco, novoArco(), { t: 0 });
        }
        desenhar();
      }
      requestAnimationFrame(quadro);
    }

    ajustar();
    if (typeof ResizeObserver !== 'undefined') {
      observador = new ResizeObserver(ajustar);
      observador.observe(canvas);
    } else {
      window.addEventListener('resize', ajustar);
    }
    if (!reduzir) requestAnimationFrame(quadro);

    return {
      parar() {
        rodando = false;
        if (observador) observador.disconnect();
        else window.removeEventListener('resize', ajustar);
      }
    };
  }

  window.Globo = { iniciar };
})();
