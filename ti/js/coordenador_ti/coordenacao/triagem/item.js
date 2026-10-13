/**
 * item.js — uma linha da triagem: o chamado/demanda, a sugestão e os campos "Direcionar para" e "Quem assume?".
 * Parte da tela "Triagem" (veja triagem.js). Tabelas: ti_chamados, ti_demandas, ti_auditoria (escrita).
 */
window.TI = window.TI || {};
TI.telas.triagemBlocos = TI.telas.triagemBlocos || {};

/**
 * @param {Object} item  { tipo, id, codigo, titulo, quem, onde, criado_em, sugestao, grupos }
 * @param {{ativos:Object[], recarregar:Function}} contexto
 * @returns {HTMLElement}
 */
TI.telas.triagemBlocos.item = function (item, contexto) {
  const { el } = TI.dom;
  const { ui, fmt, K } = TI;
  const { ativos, recarregar } = contexto;

  const selGrupo = ui.select(item.grupos.map((g) => [g, K.grupos[g]]), item.sugestao, { 'aria-label': 'Direcionar para' });
  const selPessoa = ui.select([['', 'Quem assume? (fica na fila do grupo)']], '', { 'aria-label': 'Pessoa responsável' });
  /** Atualiza a lista de pessoas conforme o grupo escolhido. */
  function pessoas() {
    const doGrupo = ativos.filter((p) => K.grupoDoSetor(p.setor) === selGrupo.value);
    selPessoa.replaceChildren(el('option', { value: '' }, ['Quem assume? (fica na fila do grupo)']),
      ...doGrupo.map((p) => el('option', { value: p.id }, [p.nome + ' · ' + K.setores[p.setor]])));
  }
  selGrupo.addEventListener('change', pessoas);
  pessoas();

  return el('div', { class: 'ti-linha ti-triagem-item' }, [
    el('div', { class: 'ti-acoes' }, [ui.chipTipo(item.tipo), el('span', { class: 'ti-codigo' }, [item.codigo]), el('span', { class: 'ti-sub' }, [fmt.idade(item.criado_em)])]),
    el('div', { class: 'ti-linha-texto' }, [
      el('span', { class: 'ti-linha-titulo ti-triagem-titulo' }, [item.titulo]),
      el('span', { class: 'ti-linha-sub' }, [item.quem + (item.onde ? ' · ' + item.onde : '')])
    ]),
    el('div', { class: 'ti-filtros' }, [
      el('div', { class: 'ti-triagem-campo' }, [selGrupo]),
      el('div', { class: 'ti-triagem-campo largo' }, [selPessoa]),
      ui.botao('Direcionar', { tipo: 'primario', onClick: async () => {
        const campos = { grupo_destino: selGrupo.value, responsavel_id: selPessoa.value || null };
        if (item.tipo === 'chamado') await TI.dados.chamados.atualizar(item.id, campos);
        else await TI.dados.demandas.atualizar(item.id, campos);
        await TI.dados.auditoria.registrar(item.tipo + '.direcionado', item.tipo, item.id, campos);
        ui.toast(item.codigo + ' direcionado para ' + K.grupos[selGrupo.value] + '.');
        await recarregar();
      } })
    ])
  ]);
};
