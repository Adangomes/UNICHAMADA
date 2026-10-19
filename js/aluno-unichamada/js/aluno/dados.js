// Camada de dados da tela do aluno (só leitura). Usa o dbListar(tabela) do db.js.
(function () {
  const M = window.MAPA_BANCO;
  const eq = (a, b) => a != null && b != null && String(a) === String(b);
  const norm = (s) => String(s ?? "").trim().toLowerCase();

  async function listar(tabela) {
    if (typeof dbListar !== "function") throw new Error("dbListar não encontrado: ajuste listar() em js/aluno/dados.js");
    return (await dbListar(tabela)) || [];
  }

  const estavaPresente = (p) => {
    const col = M.presencas.status;
    if (!col) return true;
    const v = p[col];
    return !(v === false || v === "falta" || v === "F" || v === "ausente");
  };

  // Login do aluno: RA + e-mail (mesmo padrão do professor e do coordenador)
  async function autenticar(ra, email) {
    const A = M.alunos;
    if (!norm(ra) || !norm(email)) return null;
    const alunos = await listar(A.tabela);
    return alunos.find((a) => norm(a[A.ra]) === norm(ra) && norm(a[A.email]) === norm(email)) || null;
  }

  // Monta: cursos > disciplinas > aulas, com presenças e faltas do aluno
  async function carregar(aluno) {
    const [cursos, discs, turmas, mats, chams, pres] = await Promise.all(
      ["cursos", "disciplinas", "turmas", "matriculas", "chamadas", "presencas"].map((k) => listar(M[k].tabela))
    );
    const meuId = aluno[M.alunos.id];
    const minhasPres = pres.filter((p) => eq(p[M.presencas.aluno], meuId));
    const idsTurmas = [...new Set(mats.filter((m) => eq(m[M.matriculas.aluno], meuId)).map((m) => String(m[M.matriculas.turma])))];

    const grupos = new Map();
    const totais = { presencas: 0, faltas: 0, total: 0 };

    for (const idTurma of idsTurmas) {
      const turma = turmas.find((t) => eq(t[M.turmas.id], idTurma));
      if (!turma) continue;
      const disc = discs.find((d) => eq(d[M.disciplinas.id], turma[M.turmas.disciplina]));
      const curso = disc && cursos.find((c) => eq(c[M.cursos.id], disc[M.disciplinas.curso]));
      const nomeCurso = (curso && curso[M.cursos.nome]) || "Sem curso";

      const aulas = chams
        .filter((c) => eq(c[M.chamadas.turma], idTurma))
        .sort((a, b) => new Date(b[M.chamadas.data]) - new Date(a[M.chamadas.data]))
        .map((c) => {
          const p = minhasPres.find((x) => eq(x[M.presencas.chamada], c[M.chamadas.id]));
          return { data: c[M.chamadas.data], presente: !!p && estavaPresente(p) };
        });

      const presencas = aulas.filter((a) => a.presente).length;
      const item = { nome: (disc && disc[M.disciplinas.nome]) || "Disciplina", total: aulas.length, presencas, faltas: aulas.length - presencas, aulas };
      if (!grupos.has(nomeCurso)) grupos.set(nomeCurso, []);
      grupos.get(nomeCurso).push(item);
      totais.presencas += presencas; totais.faltas += item.faltas; totais.total += item.total;
    }
    return {
      aluno,
      totais,
      grupos: [...grupos].map(([curso, disciplinas]) => ({ curso, disciplinas: disciplinas.sort((a, b) => a.nome.localeCompare(b.nome)) })),
    };
  }

  window.DadosAluno = { autenticar, carregar };
})();
