/* =========================================================
   UniChamada - Relatórios (dashboard dos painéis de coordenador e professor)
   Lê as tabelas direto do Supabase e mostra números, gráficos e tabelas num
   painel escuro verde-água, com um globo girando ao fundo e destaques em carrossel.

   Seções
   - Coordenador: Visão geral | Alunos | Cursos | Disciplinas | Professores
   - Professor:   Minha atuação | Professores | Cursos
   O RA e o e-mail das pessoas NÃO aparecem aqui (só nomes e contagens).

   Uso (nas abas dos painéis):
     renderRelatorios(container, 'coordenador')
     renderRelatorios(container, 'professor', professorLogado)
     Relatorios.parar()   // ao sair da aba (desliga animação e atualização automática)

   Dependências: js/relatorios/globo.js (opcional) e window.supabaseClient (js/data/db.js).
   Estilo: css/relatorios.css
   ========================================================= */
(function () {
  'use strict';
  if (window.Relatorios) return;

  const ATUALIZAR_A_CADA_MS = 30000;       // busca de novo no banco
  const CARROSSEL_A_CADA_MS = 5000;        // troca de destaque

  // Colunas lidas de cada tabela (sem as fotos em base64, que pesam muito).
  // Se o seu banco tiver outro nome de coluna, a busca tenta de novo com "*".
  const TABELAS = {
    alunos:      'id, nome, curso_id',
    professores: 'id, nome',
    cursos:      'id, nome',
    disciplinas: 'id, nome, curso_id, professor_id',
    turmas:      'id, nome, curso_id, disciplina_id, professor_id',
    matriculas:  'id, aluno_id, turma_id',
    chamadas:    'id, turma_id, professor_id, ativa',
    presencas:   'id, turma_id, aluno_id, status'
  };

  const SECOES = {
    coordenador: [
      { id: 'geral', rotulo: 'Visão geral', icone: '◧' },
      { id: 'alunos', rotulo: 'Alunos', icone: '🎓' },
      { id: 'cursos', rotulo: 'Cursos', icone: '📚' },
      { id: 'disciplinas', rotulo: 'Disciplinas', icone: '📖' },
      { id: 'professores', rotulo: 'Professores', icone: '👩‍🏫' }
    ],
    professor: [
      { id: 'geral', rotulo: 'Minha atuação', icone: '◧' },
      { id: 'professores', rotulo: 'Professores', icone: '👩‍🏫' },
      { id: 'cursos', rotulo: 'Cursos', icone: '📚' }
    ]
  };

  // =========================================================
  // 1) BUSCA NO BANCO
  // =========================================================
  async function buscarTabela(nome) {
    const cli = window.supabaseClient;
    if (!cli) return typeof window.dbListar === 'function' ? await window.dbListar(nome) : [];
    for (const colunas of [TABELAS[nome], '*']) {
      const linhas = [];
      let falhou = false;
      for (let ini = 0; ; ini += 1000) {                  // o Supabase entrega no máximo 1000 por vez
        const { data, error } = await cli.from(nome).select(colunas).order('id', { ascending: true }).range(ini, ini + 999);
        if (error) { falhou = true; break; }
        linhas.push(...data);
        if (data.length < 1000) break;
      }
      if (!falhou) return linhas;
    }
    console.warn('Relatórios: não consegui ler a tabela', nome);
    return [];
  }

  async function buscarDados() {
    const nomes = Object.keys(TABELAS);
    const listas = await Promise.all(nomes.map(buscarTabela));
    const dados = {};
    nomes.forEach((n, i) => { dados[n] = listas[i]; });
    return dados;
  }

  // =========================================================
  // 2) CÁLCULOS (funções puras: recebem as tabelas e devolvem números)
  // =========================================================
  const sid = (v) => (v == null ? '' : String(v));
  const porNomeAsc = (a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR');
  const porValorDesc = (a, b) => b.valor - a.valor || porNomeAsc(a, b);

  function calcularPresenca(lista) {
    let presentes = 0, faltas = 0, justificadas = 0;
    for (const p of lista) {
      if (p.status === 'presente') presentes++;
      else if (p.status === 'falta') faltas++;
      else if (p.status === 'falta_justificada') justificadas++;
    }
    const total = presentes + faltas + justificadas;
    return { presentes, faltas, justificadas, total, taxa: total ? Math.round((presentes / total) * 1000) / 10 : null };
  }

  function calcular(d, papel, euId) {
    const alunos = d.alunos || [], professores = d.professores || [], cursos = d.cursos || [];
    const disciplinas = d.disciplinas || [], turmas = d.turmas || [], matriculas = d.matriculas || [];
    const chamadas = d.chamadas || [], presencas = d.presencas || [];

    const cursoPorId = new Map(cursos.map((c) => [sid(c.id), c]));
    const discPorId = new Map(disciplinas.map((x) => [sid(x.id), x]));
    const turmaPorId = new Map(turmas.map((t) => [sid(t.id), t]));
    const profPorId = new Map(professores.map((p) => [sid(p.id), p]));
    const nomeCurso = (id) => (cursoPorId.get(sid(id)) || {}).nome || 'Sem curso';
    const nomeProf = (id) => (profPorId.get(sid(id)) || {}).nome || '—';

    // matrículas: quem está em qual turma
    const turmasDoAluno = new Map(), alunosDaTurma = new Map();
    for (const m of matriculas) {
      const a = sid(m.aluno_id), t = sid(m.turma_id);
      if (!turmasDoAluno.has(a)) turmasDoAluno.set(a, new Set());
      if (!alunosDaTurma.has(t)) alunosDaTurma.set(t, new Set());
      turmasDoAluno.get(a).add(t);
      alunosDaTurma.get(t).add(a);
    }
    const alunosDeTurmas = (ids) => {                      // alunos distintos de um conjunto de turmas
      const s = new Set();
      ids.forEach((t) => (alunosDaTurma.get(sid(t)) || []).forEach((a) => s.add(a)));
      return s;
    };

    // disciplinas de cada aluno = disciplinas das turmas em que ele está matriculado
    const discsDoAluno = new Map();
    for (const [a, ts] of turmasDoAluno) {
      const s = new Set();
      ts.forEach((t) => { const tur = turmaPorId.get(t); if (tur && tur.disciplina_id != null) s.add(sid(tur.disciplina_id)); });
      discsDoAluno.set(a, s);
    }

    // ---- alunos ----
    const listaAlunos = alunos.map((a) => ({
      id: sid(a.id), nome: a.nome || '—', curso: nomeCurso(a.curso_id),
      disciplinas: (discsDoAluno.get(sid(a.id)) || new Set()).size
    })).sort(porNomeAsc);

    const alunosPorCurso = cursos.map((c) => ({
      id: sid(c.id), nome: c.nome || '—', valor: alunos.filter((a) => sid(a.curso_id) === sid(c.id)).length
    })).sort(porValorDesc);
    const semCurso = alunos.filter((a) => !cursoPorId.has(sid(a.curso_id))).length;
    if (semCurso) alunosPorCurso.push({ id: '', nome: 'Sem curso', valor: semCurso });

    const faixas = [0, 0, 0, 0, 0];                        // 0, 1, 2, 3, 4+ disciplinas
    listaAlunos.forEach((a) => { faixas[Math.min(a.disciplinas, 4)]++; });
    const distDisciplinas = ['0', '1', '2', '3', '4+'].map((rotulo, i) => ({ nome: rotulo, valor: faixas[i] }));
    const somaDisc = listaAlunos.reduce((s, a) => s + a.disciplinas, 0);

    // ---- cursos ----
    const listaCursos = cursos.map((c) => {
      const cid = sid(c.id);
      const profs = new Set();
      disciplinas.filter((x) => sid(x.curso_id) === cid && x.professor_id != null).forEach((x) => profs.add(sid(x.professor_id)));
      turmas.filter((t) => sid(t.curso_id) === cid && t.professor_id != null).forEach((t) => profs.add(sid(t.professor_id)));
      return {
        id: cid, nome: c.nome || '—',
        alunos: alunos.filter((a) => sid(a.curso_id) === cid).length,
        disciplinas: disciplinas.filter((x) => sid(x.curso_id) === cid).length,
        turmas: turmas.filter((t) => sid(t.curso_id) === cid).length,
        professores: profs.size
      };
    }).sort(porNomeAsc);

    // ---- disciplinas ----
    const listaDisciplinas = disciplinas.map((x) => {
      const did = sid(x.id);
      const ts = turmas.filter((t) => sid(t.disciplina_id) === did);
      const profIds = new Set();
      if (x.professor_id != null) profIds.add(sid(x.professor_id));
      ts.forEach((t) => { if (t.professor_id != null) profIds.add(sid(t.professor_id)); });
      return {
        id: did, nome: x.nome || '—', curso: nomeCurso(x.curso_id),
        professor: [...profIds].map(nomeProf).sort().join(', ') || '—',
        turmas: ts.length, alunos: alunosDeTurmas(ts.map((t) => t.id)).size
      };
    }).sort(porNomeAsc);

    // ---- professores ----
    const listaProfessores = professores.map((p) => {
      const pid = sid(p.id);
      const ts = turmas.filter((t) => sid(t.professor_id) === pid);
      const discIds = new Set(disciplinas.filter((x) => sid(x.professor_id) === pid).map((x) => sid(x.id)));
      ts.forEach((t) => { if (t.disciplina_id != null) discIds.add(sid(t.disciplina_id)); });
      const cursoIds = new Set();
      discIds.forEach((id) => { const x = discPorId.get(id); if (x && x.curso_id != null) cursoIds.add(sid(x.curso_id)); });
      ts.forEach((t) => { if (t.curso_id != null) cursoIds.add(sid(t.curso_id)); });
      return {
        id: pid, nome: p.nome || '—',
        cursos: [...cursoIds].map(nomeCurso).sort((a, b) => a.localeCompare(b, 'pt-BR')),
        disciplinas: discIds.size, turmas: ts.length, alunos: alunosDeTurmas(ts.map((t) => t.id)).size
      };
    }).sort(porNomeAsc);

    // ---- escopo do professor logado ----
    let meu = null;
    if (papel === 'professor') {
      const meuId = sid(euId);
      const minhas = turmas.filter((t) => sid(t.professor_id) === meuId);
      const discIds = new Set(disciplinas.filter((x) => sid(x.professor_id) === meuId).map((x) => sid(x.id)));
      minhas.forEach((t) => { if (t.disciplina_id != null) discIds.add(sid(t.disciplina_id)); });
      const idsMinhas = new Set(minhas.map((t) => sid(t.id)));
      const minhasChamadas = chamadas.filter((c) => sid(c.professor_id) === meuId);
      meu = {
        turmas: minhas.map((t) => ({
          id: sid(t.id), nome: t.nome || '—',
          valor: (alunosDaTurma.get(sid(t.id)) || new Set()).size,
          disciplina: ((discPorId.get(sid(t.disciplina_id)) || {}).nome) || '—'
        })).sort(porValorDesc),
        disciplinas: discIds.size,
        alunos: alunosDeTurmas(minhas.map((t) => t.id)).size,
        chamadas: minhasChamadas.length,
        chamadasAtivas: minhasChamadas.filter((c) => c.ativa === true).length,
        presenca: calcularPresenca(presencas.filter((p) => idsMinhas.has(sid(p.turma_id)))),
        cursos: (listaProfessores.find((p) => p.id === meuId) || { cursos: [] }).cursos
      };
    }

    // ---- destaques do carrossel ----
    const presencaGeral = calcularPresenca(presencas);
    const destaques = [];
    if (papel === 'coordenador') {
      if (alunosPorCurso.length && alunosPorCurso[0].valor > 0) {
        destaques.push({ titulo: 'Curso com mais alunos', valor: alunosPorCurso[0].nome, detalhe: alunosPorCurso[0].valor + ' aluno(s)' });
      }
      const topDisc = [...listaDisciplinas].sort((a, b) => b.alunos - a.alunos)[0];
      if (topDisc && topDisc.alunos > 0) destaques.push({ titulo: 'Disciplina com mais alunos', valor: topDisc.nome, detalhe: topDisc.alunos + ' aluno(s)' });
      const topProf = [...listaProfessores].sort((a, b) => b.turmas - a.turmas)[0];
      if (topProf && topProf.turmas > 0) destaques.push({ titulo: 'Professor com mais turmas', valor: topProf.nome, detalhe: topProf.turmas + ' turma(s)' });
      if (presencaGeral.taxa != null) destaques.push({ titulo: 'Taxa de presença geral', valor: presencaGeral.taxa + '%', detalhe: presencaGeral.total + ' registro(s) de presença' });
      const semMatricula = listaAlunos.filter((a) => a.disciplinas === 0).length;
      if (semMatricula) destaques.push({ titulo: 'Alunos sem disciplina', valor: String(semMatricula), detalhe: 'ainda sem matrícula em turma' });
    } else if (meu) {
      if (meu.turmas.length && meu.turmas[0].valor > 0) destaques.push({ titulo: 'Sua turma com mais alunos', valor: meu.turmas[0].nome, detalhe: meu.turmas[0].valor + ' aluno(s)' });
      destaques.push({
        titulo: 'Chamadas em andamento',
        valor: String(meu.chamadasAtivas),
        detalhe: meu.chamadasAtivas ? 'abertas agora' : 'nenhuma aberta no momento'
      });
      if (meu.presenca.taxa != null) destaques.push({ titulo: 'Presença nas suas turmas', valor: meu.presenca.taxa + '%', detalhe: meu.presenca.total + ' registro(s)' });
    }
    if (!destaques.length) destaques.push({ titulo: 'Aguardando dados', valor: '—', detalhe: 'assim que houver cadastros, eles aparecem aqui' });

    return {
      totais: {
        alunos: alunos.length, professores: professores.length, cursos: cursos.length,
        disciplinas: disciplinas.length, turmas: turmas.length, matriculas: matriculas.length, chamadas: chamadas.length
      },
      presenca: presencaGeral,
      alunos: listaAlunos, alunosPorCurso, distDisciplinas,
      mediaDisciplinas: listaAlunos.length ? Math.round((somaDisc / listaAlunos.length) * 10) / 10 : 0,
      semDisciplina: listaAlunos.filter((a) => a.disciplinas === 0).length,
      cursos: listaCursos, disciplinas: listaDisciplinas, professores: listaProfessores,
      meu, destaques
    };
  }

  // =========================================================
  // 3) PEÇAS VISUAIS (sem biblioteca: DOM + SVG)
  // =========================================================
  const fmt = (n) => Number(n).toLocaleString('pt-BR');

  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function montar(pai, ...filhos) {
    filhos.flat().forEach((f) => { if (f) pai.appendChild(f); });
    return pai;
  }
  function depoisDoDesenho(fn) { requestAnimationFrame(() => requestAnimationFrame(fn)); }

  function contar(alvoEl, alvo, sufixo) {                  // número subindo até o valor
    const inicio = performance.now(), duracao = 700;
    function passo(agora) {
      if (alvoEl.isConnected === false) return;
      const k = Math.min(1, (agora - inicio) / duracao);
      alvoEl.textContent = fmt(Math.round(alvo * (1 - Math.pow(1 - k, 3)))) + (sufixo || '');
      if (k < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  function cartao(titulo, ...filhos) {
    const c = el('section', 'rel-cartao');
    if (titulo) c.appendChild(el('h3', 'rel-cartao-titulo', titulo));
    return montar(c, ...filhos);
  }

  function kpi(rotulo, valor, icone, sufixo) {
    const c = el('div', 'rel-kpi');
    c.appendChild(el('span', 'rel-kpi-icone', icone));
    const v = el('div', 'rel-kpi-valor', '0');
    c.appendChild(v);
    c.appendChild(el('div', 'rel-kpi-rotulo', rotulo));
    contar(v, valor, sufixo);
    return c;
  }

  function barras(itens, vazio) {                          // barras horizontais
    const caixa = el('div', 'rel-barras');
    if (!itens.length) { caixa.appendChild(el('p', 'rel-vazio', vazio || 'Sem dados ainda.')); return caixa; }
    const max = Math.max(...itens.map((i) => i.valor), 1);
    itens.forEach((i) => {
      const linha = el('div', 'rel-barra-linha');
      linha.appendChild(el('span', 'rel-barra-nome', i.nome));
      const trilho = el('div', 'rel-barra-trilho');
      const fill = el('div', 'rel-barra-fill');
      fill.style.width = '0%';
      trilho.appendChild(fill);
      linha.appendChild(trilho);
      linha.appendChild(el('span', 'rel-barra-valor', fmt(i.valor)));
      caixa.appendChild(linha);
      depoisDoDesenho(() => { fill.style.width = Math.max(i.valor ? 3 : 0, (i.valor / max) * 100) + '%'; });
    });
    return caixa;
  }

  function colunas(itens) {                                // colunas verticais
    const caixa = el('div', 'rel-colunas');
    const max = Math.max(...itens.map((i) => i.valor), 1);
    itens.forEach((i) => {
      const col = el('div', 'rel-coluna');
      col.appendChild(el('span', 'rel-coluna-valor', fmt(i.valor)));
      const trilho = el('div', 'rel-coluna-trilho');
      const fill = el('div', 'rel-coluna-fill');
      fill.style.height = '0%';
      trilho.appendChild(fill);
      col.appendChild(trilho);
      col.appendChild(el('span', 'rel-coluna-nome', i.nome));
      caixa.appendChild(col);
      depoisDoDesenho(() => { fill.style.height = Math.max(i.valor ? 4 : 0, (i.valor / max) * 100) + '%'; });
    });
    return caixa;
  }

  function rosca(pres, legenda) {                          // gráfico de rosca (taxa de presença)
    const caixa = el('div', 'rel-rosca');
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 140 140');
    svg.setAttribute('class', 'rel-rosca-svg');
    const raio = 56, circ = 2 * Math.PI * raio;
    const fundo = document.createElementNS(ns, 'circle');
    [['cx', 70], ['cy', 70], ['r', raio], ['fill', 'none'], ['stroke-width', 12], ['class', 'rel-rosca-fundo']].forEach(([k, v]) => fundo.setAttribute(k, v));
    const arco = document.createElementNS(ns, 'circle');
    [['cx', 70], ['cy', 70], ['r', raio], ['fill', 'none'], ['stroke-width', 12], ['stroke-linecap', 'round'],
     ['transform', 'rotate(-90 70 70)'], ['class', 'rel-rosca-arco'],
     ['stroke-dasharray', circ.toFixed(2)], ['stroke-dashoffset', circ.toFixed(2)]].forEach(([k, v]) => arco.setAttribute(k, v));
    svg.appendChild(fundo); svg.appendChild(arco);
    caixa.appendChild(svg);
    const centro = el('div', 'rel-rosca-centro');
    const valor = el('strong', null, pres.taxa == null ? '—' : '0%');
    centro.appendChild(valor);
    centro.appendChild(el('small', null, legenda));
    caixa.appendChild(centro);
    if (pres.taxa != null) {
      depoisDoDesenho(() => arco.setAttribute('stroke-dashoffset', (circ * (1 - pres.taxa / 100)).toFixed(2)));
      const casas = pres.taxa % 1 ? 1 : 0;
      const inicio = performance.now();
      (function passo(agora) {
        if (valor.isConnected === false) return;
        const k = Math.min(1, (agora - inicio) / 800);
        valor.textContent = (pres.taxa * (1 - Math.pow(1 - k, 3))).toFixed(casas).replace('.', ',') + '%';
        if (k < 1) requestAnimationFrame(passo);
      })(inicio);
    }
    const resumo = el('ul', 'rel-rosca-legenda');
    [['Presentes', pres.presentes, 'ok'], ['Faltas', pres.faltas, 'falta'], ['Justificadas', pres.justificadas, 'just']].forEach(([n, v, c]) => {
      const li = el('li', 'rel-leg-' + c);
      li.appendChild(el('span', 'rel-leg-ponto'));
      li.appendChild(document.createTextNode(n + ': ' + fmt(v)));
      resumo.appendChild(li);
    });
    caixa.appendChild(resumo);
    return caixa;
  }

  function tabela(cabecalho, linhas, vazio) {
    const envolta = el('div', 'rel-tabela-wrap');
    if (!linhas.length) { envolta.appendChild(el('p', 'rel-vazio', vazio || 'Nada para mostrar ainda.')); return envolta; }
    const t = el('table', 'rel-tabela');
    const cab = el('tr');
    cabecalho.forEach((h) => cab.appendChild(el('th', null, h)));
    t.appendChild(el('thead')).appendChild(cab);
    const corpo = el('tbody');
    linhas.forEach((l) => {
      const tr = el('tr', l.classe);
      l.celulas.forEach((c) => {
        const td = el('td');
        if (c instanceof Node) td.appendChild(c); else td.textContent = c;
        tr.appendChild(td);
      });
      corpo.appendChild(tr);
    });
    t.appendChild(corpo);
    envolta.appendChild(t);
    return envolta;
  }

  function chips(nomes) {
    const caixa = el('div', 'rel-chips');
    if (!nomes.length) { caixa.appendChild(el('span', 'rel-chip rel-chip-vazio', 'sem vínculo')); return caixa; }
    nomes.forEach((n) => caixa.appendChild(el('span', 'rel-chip', n)));
    return caixa;
  }

  // =========================================================
  // 4) ESTADO E TELAS
  // =========================================================
  let estado = null;

  function carrossel(destaques) {                          // destaques que trocam sozinhos
    const caixa = el('section', 'rel-carrossel');
    const slides = destaques.map((d, i) => {
      const s = el('div', 'rel-slide' + (i === 0 ? ' ativo' : ''));
      s.appendChild(el('span', 'rel-slide-titulo', d.titulo));
      s.appendChild(el('strong', 'rel-slide-valor', d.valor));
      s.appendChild(el('span', 'rel-slide-detalhe', d.detalhe));
      caixa.appendChild(s);
      return s;
    });
    const pontos = el('div', 'rel-pontos');
    const marcas = destaques.map((_, i) => {
      const p = el('button', 'rel-ponto' + (i === 0 ? ' ativo' : ''));
      p.type = 'button';
      p.setAttribute('aria-label', 'Destaque ' + (i + 1));
      pontos.appendChild(p);
      return p;
    });
    caixa.appendChild(pontos);

    let atual = 0, pausado = false;
    function ir(i) {
      slides[atual].classList.remove('ativo'); marcas[atual].classList.remove('ativo');
      atual = (i + slides.length) % slides.length;
      slides[atual].classList.add('ativo'); marcas[atual].classList.add('ativo');
    }
    marcas.forEach((p, i) => p.addEventListener('click', () => ir(i)));
    caixa.addEventListener('mouseenter', () => { pausado = true; });
    caixa.addEventListener('mouseleave', () => { pausado = false; });
    if (slides.length > 1 && estado) {
      estado.timerCarrossel = setInterval(() => {
        if (caixa.isConnected === false) return;
        if (!pausado) ir(atual + 1);
      }, CARROSSEL_A_CADA_MS);
    }
    return caixa;
  }

  function secaoGeral(e) {
    const r = e.r, pagina = el('div', 'rel-pagina');
    const faixa = el('div', 'rel-kpis');
    let esquerda, direita;
    if (e.papel === 'coordenador') {
      montar(faixa,
        kpi('Alunos', r.totais.alunos, '🎓'), kpi('Professores', r.totais.professores, '👩‍🏫'),
        kpi('Cursos', r.totais.cursos, '📚'), kpi('Disciplinas', r.totais.disciplinas, '📖'),
        kpi('Turmas', r.totais.turmas, '🏫'), kpi('Matrículas', r.totais.matriculas, '📝'));
      esquerda = cartao('Alunos por curso', barras(r.alunosPorCurso.slice(0, 8), 'Cadastre cursos e alunos para ver o gráfico.'));
      direita = cartao('Presença geral', rosca(r.presenca, 'presença'));
    } else {
      const m = r.meu;
      montar(faixa,
        kpi('Minhas turmas', m.turmas.length, '🏫'), kpi('Minhas disciplinas', m.disciplinas, '📖'),
        kpi('Meus alunos', m.alunos, '🎓'), kpi('Chamadas feitas', m.chamadas, '📋'),
        kpi('Chamadas abertas', m.chamadasAtivas, '🟢'));
      esquerda = cartao('Alunos por turma', barras(m.turmas.slice(0, 8), 'A coordenação ainda não atribuiu turmas a você.'));
      direita = cartao('Presença nas suas turmas', rosca(m.presenca, 'presença'));
    }
    montar(pagina, faixa, carrossel(r.destaques), montar(el('div', 'rel-duas'), esquerda, direita));
    return pagina;
  }

  function secaoAlunos(e) {
    const r = e.r, pagina = el('div', 'rel-pagina');
    montar(pagina,
      montar(el('div', 'rel-kpis'),
        kpi('Alunos', r.totais.alunos, '🎓'),
        kpiMedia(r.mediaDisciplinas),
        kpi('Alunos sem disciplina', r.semDisciplina, '⚠️')),
      montar(el('div', 'rel-duas'),
        cartao('Alunos por curso', barras(r.alunosPorCurso, 'Sem cursos cadastrados.')),
        cartao('Quantas disciplinas cada aluno cursa', colunas(r.distDisciplinas))));

    // tabela com busca
    const busca = el('input', 'rel-busca');
    busca.type = 'search'; busca.placeholder = 'Pesquisar aluno ou curso...'; busca.value = e.termo;
    const area = el('div');
    function desenhar() {
      const termo = semAcento(busca.value.trim());
      e.termo = busca.value;
      const filtrados = r.alunos.filter((a) => !termo || semAcento(a.nome).includes(termo) || semAcento(a.curso).includes(termo));
      area.textContent = '';
      area.appendChild(tabela(['Aluno', 'Curso', 'Disciplinas'],
        filtrados.slice(0, 200).map((a) => ({ celulas: [a.nome, a.curso, String(a.disciplinas)] })),
        'Nenhum aluno encontrado.'));
      if (filtrados.length > 200) area.appendChild(el('p', 'rel-nota', 'Mostrando 200 de ' + fmt(filtrados.length) + '. Use a busca para filtrar.'));
    }
    busca.addEventListener('input', desenhar);
    desenhar();
    pagina.appendChild(cartao('Alunos e disciplinas', busca, area));
    return pagina;
  }
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function kpiMedia(media) {                                // média tem casa decimal: não usa a contagem inteira
    const c = el('div', 'rel-kpi');
    c.appendChild(el('span', 'rel-kpi-icone', '📖'));
    c.appendChild(el('div', 'rel-kpi-valor', String(media).replace('.', ',')));
    c.appendChild(el('div', 'rel-kpi-rotulo', 'Média de disciplinas por aluno'));
    return c;
  }

  function secaoCursos(e) {
    const r = e.r, meus = new Set((r.meu && r.meu.cursos) || []);
    const pagina = el('div', 'rel-pagina');
    const linhas = r.cursos.map((c) => {
      const nome = el('span');
      nome.appendChild(document.createTextNode(c.nome + ' '));
      if (meus.has(c.nome)) nome.appendChild(el('span', 'rel-chip rel-chip-eu', 'seu curso'));
      return { classe: meus.has(c.nome) ? 'rel-linha-eu' : '', celulas: [nome, fmt(c.alunos), fmt(c.disciplinas), fmt(c.turmas), fmt(c.professores)] };
    });
    montar(pagina,
      montar(el('div', 'rel-kpis'), kpi('Cursos', r.totais.cursos, '📚'), kpi('Disciplinas', r.totais.disciplinas, '📖'), kpi('Turmas', r.totais.turmas, '🏫')),
      cartao('Alunos por curso', barras(r.cursos.map((c) => ({ nome: c.nome, valor: c.alunos })).sort(porValorDesc), 'Sem cursos cadastrados.')),
      cartao('Cursos', tabela(['Curso', 'Alunos', 'Disciplinas', 'Turmas', 'Professores'], linhas, 'Sem cursos cadastrados.')));
    return pagina;
  }

  function secaoDisciplinas(e) {
    const r = e.r, pagina = el('div', 'rel-pagina');
    montar(pagina,
      montar(el('div', 'rel-kpis'), kpi('Disciplinas', r.totais.disciplinas, '📖'), kpi('Turmas', r.totais.turmas, '🏫'), kpi('Matrículas', r.totais.matriculas, '📝')),
      cartao('Alunos por disciplina',
        barras([...r.disciplinas].sort((a, b) => b.alunos - a.alunos).slice(0, 10).map((x) => ({ nome: x.nome, valor: x.alunos })), 'Sem disciplinas cadastradas.')),
      cartao('Disciplinas', tabela(['Disciplina', 'Curso', 'Professor', 'Turmas', 'Alunos'],
        r.disciplinas.map((x) => ({ celulas: [x.nome, x.curso, x.professor, fmt(x.turmas), fmt(x.alunos)] })), 'Sem disciplinas cadastradas.')));
    return pagina;
  }

  function secaoProfessores(e) {
    const r = e.r, meuId = e.papel === 'professor' && e.pessoa ? sid(e.pessoa.id) : null;
    const pagina = el('div', 'rel-pagina');
    const linhas = r.professores.map((p) => {
      const nome = el('span');
      nome.appendChild(document.createTextNode(p.nome + ' '));
      if (meuId && p.id === meuId) nome.appendChild(el('span', 'rel-chip rel-chip-eu', 'você'));
      return { classe: meuId && p.id === meuId ? 'rel-linha-eu' : '', celulas: [nome, chips(p.cursos), fmt(p.disciplinas), fmt(p.turmas), fmt(p.alunos)] };
    });
    montar(pagina,
      montar(el('div', 'rel-kpis'), kpi('Professores', r.totais.professores, '👩‍🏫'), kpi('Turmas', r.totais.turmas, '🏫'), kpi('Cursos', r.totais.cursos, '📚')),
      cartao('Turmas por professor',
        barras(r.professores.map((p) => ({ nome: p.nome, valor: p.turmas })).sort(porValorDesc).slice(0, 10), 'Sem professores cadastrados.')),
      cartao('Professores e cursos vinculados', tabela(['Professor', 'Cursos vinculados', 'Disciplinas', 'Turmas', 'Alunos'], linhas, 'Sem professores cadastrados.')));
    return pagina;
  }

  const TELAS = { geral: secaoGeral, alunos: secaoAlunos, cursos: secaoCursos, disciplinas: secaoDisciplinas, professores: secaoProfessores };

  function desenharSecao() {
    const e = estado;
    if (!e || !e.r) return;
    clearInterval(e.timerCarrossel);
    e.conteudo.textContent = '';
    e.botoesNav.forEach((b) => b.botao.classList.toggle('ativo', b.id === e.secao));
    const tela = TELAS[e.secao] || secaoGeral;
    e.conteudo.appendChild(tela(e));
  }

  function irPara(secao) {
    if (!estado) return;
    estado.secao = secao;
    desenharSecao();
  }

  async function carregar(forcar) {
    const e = estado;
    if (!e) return;
    try {
      const dados = await buscarDados();
      if (estado !== e) return;                            // saiu da aba enquanto buscava
      const r = calcular(dados, e.papel, e.pessoa && e.pessoa.id);
      const assinatura = JSON.stringify(r);
      e.carimbo.textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      e.vivo.classList.remove('erro');
      if (forcar || assinatura !== e.assinatura) {         // só redesenha se algo mudou
        e.assinatura = assinatura;
        e.r = r;
        desenharSecao();
      }
    } catch (erro) {
      console.error('Relatórios: erro ao carregar', erro);
      if (estado === e) { e.carimbo.textContent = 'Não foi possível atualizar'; e.vivo.classList.add('erro'); }
    }
  }

  function parar() {
    if (!estado) return;
    clearInterval(estado.timerCarrossel);
    clearInterval(estado.timerAtualizar);
    if (estado.globo) estado.globo.parar();
    estado = null;
  }

  async function renderRelatorios(container, papel, pessoa) {
    parar();
    papel = papel === 'professor' ? 'professor' : 'coordenador';
    container.textContent = '';

    const raiz = el('div', 'rel-app');
    const canvas = el('canvas', 'rel-globo');
    const veu = el('div', 'rel-veu');
    const nav = el('nav', 'rel-nav');
    const principal = el('div', 'rel-principal');
    const topo = el('header', 'rel-topo');
    const conteudo = el('div', 'rel-conteudo');

    // navegação lateral
    nav.appendChild(el('div', 'rel-marca', '◈'));
    const botoesNav = SECOES[papel].map((s) => {
      const botao = el('button', 'rel-nav-item');
      botao.type = 'button';
      botao.title = s.rotulo;
      botao.appendChild(el('span', 'rel-nav-icone', s.icone));
      botao.appendChild(el('span', 'rel-nav-rotulo', s.rotulo));
      botao.addEventListener('click', () => irPara(s.id));
      nav.appendChild(botao);
      return { id: s.id, botao };
    });

    // topo
    const titulos = el('div');
    titulos.appendChild(el('h2', 'rel-titulo', 'Relatórios'));
    titulos.appendChild(el('p', 'rel-subtitulo', papel === 'coordenador'
      ? 'Painel da coordenação · dados em tempo real do banco'
      : 'Painel do professor · dados em tempo real do banco'));
    const status = el('div', 'rel-status');
    const vivo = el('span', 'rel-ao-vivo');
    const carimbo = el('span', 'rel-carimbo', 'Carregando...');
    const atualizar = el('button', 'rel-atualizar', '↻');
    atualizar.type = 'button';
    atualizar.title = 'Atualizar agora';
    atualizar.addEventListener('click', () => carregar(true));
    montar(status, vivo, carimbo, atualizar);
    montar(topo, titulos, status);

    montar(principal, topo, conteudo);
    montar(raiz, canvas, veu, nav, principal);
    container.appendChild(raiz);

    estado = {
      raiz, papel, pessoa: pessoa || null, secao: 'geral', conteudo, carimbo, vivo, botoesNav,
      r: null, assinatura: '', termo: '', timerCarrossel: null, timerAtualizar: null,
      globo: window.Globo ? window.Globo.iniciar(canvas) : null
    };
    const aqui = estado;
    aqui.timerAtualizar = setInterval(() => {
      if (raiz.isConnected === false) { if (estado === aqui) parar(); return; }
      carregar(false);
    }, ATUALIZAR_A_CADA_MS);
    await carregar(true);
  }

  window.renderRelatorios = renderRelatorios;
  window.Relatorios = { renderRelatorios, parar, irPara, calcular };
})();
