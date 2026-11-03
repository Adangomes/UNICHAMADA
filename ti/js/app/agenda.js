window.TI = window.TI || {};
TI.telas = TI.telas || {};

TI.telas.agenda = {
  render(container, ctx) {
    const funcionario = ctx.f;
    if (!funcionario?.id) {
      throw new Error('Não foi possível identificar o funcionário da sessão.');
    }

    return window.UnichamadaAgendaUI.montar(container, {
      papel: funcionario.papel === 'coordenador_ti' ? 'coordenador_ti' : 'funcionario_ti',
      id: funcionario.id,
      nome: funcionario.nome,
      ra: funcionario.ra
    }, TI.db);
  }
};
