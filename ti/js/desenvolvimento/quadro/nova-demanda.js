/**
 * nova-demanda.js — janela "Nova demanda" do quadro (título, descrição, área, prioridade, equipe).
 * Parte do quadro (veja quadro.js). Tabelas: ti_demandas (escrita), ti_auditoria (escrita).
 */
window.TI = window.TI || {};
TI.telas = TI.telas || {};
TI.telas.dev = TI.telas.dev || {};

/**
 * @param {{grupo:?string, novoGrupo:string}} opcoes  as mesmas opções do quadro
 * @param {Function} recarregar  redesenha o quadro depois de criar
 */
TI.telas.dev.novaDemanda = function (opcoes, recarregar) {
  const { ui, K } = TI;
  const titulo = ui.input({ type: 'text', placeholder: 'Ex.: Aumentar a logo do sistema' });
  const descricao = ui.textarea({ rows: '4', placeholder: 'Explique o que precisa ser feito.' });
  const area = ui.input({ type: 'text', placeholder: 'Ex.: Painel do professor' });
  const prioridade = ui.select(Object.entries(K.prioridades), 'media');
  const grupos = opcoes.grupo ? [opcoes.grupo] : ['desenvolvimento', 'banco_de_dados', 'power_bi'];
  const grupo = ui.select(grupos.map((g) => [g, K.grupos[g]]), opcoes.novoGrupo || grupos[0]);
  const modal = ui.modal({
    titulo: 'Nova demanda',
    corpo: [ui.campo('Título', titulo), ui.campo('Descrição', descricao), ui.campo('Área do sistema', area), ui.campo('Prioridade', prioridade), ui.campo('Equipe', grupo)],
    botoes: [
      ui.botao('Cancelar', { onClick: () => modal.fechar() }),
      ui.botao('Criar demanda', { tipo: 'primario', onClick: async () => {
        if (titulo.value.trim().length < 3) throw new Error('Informe um título para a demanda.');
        const nova = await TI.dados.demandas.criar({
          titulo: titulo.value.trim(), descricao: descricao.value.trim() || null, area: area.value.trim() || null,
          prioridade: prioridade.value, grupo_destino: grupo.value
        });
        await TI.dados.auditoria.registrar('demanda.criada', 'demanda', nova.id, { codigo: nova.codigo });
        ui.toast('Demanda ' + nova.codigo + ' criada.');
        modal.fechar();
        await recarregar();
      } })
    ]
  });
  titulo.focus();
};
