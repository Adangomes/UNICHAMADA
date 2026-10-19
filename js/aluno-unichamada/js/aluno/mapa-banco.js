// Nomes das tabelas e colunas do Supabase usadas pela tela do aluno.
// Se algo for diferente no seu banco, ajuste SÓ aqui.
window.MAPA_BANCO = {
  alunos:      { tabela: "alunos",      id: "id", nome: "nome", ra: "ra", email: "email" },
  cursos:      { tabela: "cursos",      id: "id", nome: "nome" },
  disciplinas: { tabela: "disciplinas", id: "id", nome: "nome", curso: "curso_id" },
  turmas:      { tabela: "turmas",      id: "id", disciplina: "disciplina_id" },
  matriculas:  { tabela: "matriculas",  aluno: "aluno_id", turma: "turma_id" },
  chamadas:    { tabela: "chamadas",    id: "id", turma: "turma_id", data: "data" },
  // status: nome da coluna que diz se estava presente (ex.: "presente"). Use null se a tabela só guarda quem esteve presente.
  presencas:   { tabela: "presencas",   chamada: "chamada_id", aluno: "aluno_id", status: null }
};
