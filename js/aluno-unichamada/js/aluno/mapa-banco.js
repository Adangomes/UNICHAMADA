window.MAPA_BANCO = {
  alunos:      { tabela: "alunos",      id: "id", nome: "nome", ra: "ra", email: "email" },
  cursos:      { tabela: "cursos",      id: "id", nome: "nome" },
  disciplinas: { tabela: "disciplinas", id: "id", nome: "nome", curso: "curso_id" },
  turmas:      { tabela: "turmas",      id: "id", disciplina: "disciplina_id" },
  matriculas:  { tabela: "matriculas",  aluno: "aluno_id", turma: "turma_id" },
  chamadas:    { tabela: "chamadas",    id: "id", turma: "turma_id", data: "data" },
  presencas:   { tabela: "presencas",   chamada: "chamada_id", aluno: "aluno_id", status: null }
};
