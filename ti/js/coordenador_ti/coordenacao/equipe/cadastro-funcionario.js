/**
 * cadastro-funcionario.js — janela "Novo funcionário": nome, RA, e-mail e setor.
 * Quem cria a conta de verdade é o n8n (chave de administrador fica lá).
 * Tabela: ti_funcionarios (via n8n).
 */
window.TI = window.TI || {};

TI.telas.cadastroFuncionario = {
  /** @param {Function} aoCriar  chamada depois que o convite é enviado */
  abrir(aoCriar) {
    const { el } = TI.dom;
    const { ui, K } = TI;

    const nome = ui.input({ type: 'text', placeholder: 'Nome e sobrenome', autocomplete: 'off' });
    const ra = ui.input({ type: 'text', placeholder: 'Número do RA / matrícula', autocomplete: 'off' });
    const email = ui.input({ type: 'email', placeholder: 'nome@empresa.com', autocomplete: 'off' });
    const setor = ui.select(K.setoresCadastro.map((s) => [s, K.setores[s]]), K.setoresCadastro[0], {
      'aria-label': 'Setor', onChange: () => desenharPermissoes()
    });
    const erro = el('div', { class: 'ti-erro', role: 'alert' });
    erro.hidden = true;
    const permissoes = el('div', { class: 'ti-aviso' });

    function desenharPermissoes() {
      const p = K.permissoesPorSetor(setor.value);
      permissoes.replaceChildren(
        el('strong', {}, ['Com o setor ' + K.setores[setor.value] + ', esta pessoa poderá:']),
        ...p.pode.map((t) => el('div', {}, [el('span', { class: 'sim' }, ['✓']), t])),
        ...p.naoPode.map((t) => el('div', {}, [el('span', { class: 'nao' }, ['✕']), 'Não poderá: ' + t.charAt(0).toLowerCase() + t.slice(1)]))
      );
    }
    desenharPermissoes();

    const modal = ui.modal({
      titulo: 'Novo funcionário',
      corpo: [
        el('p', { class: 'ti-sub' }, ['A pessoa recebe um e-mail com o link do primeiro acesso, onde cria a própria senha.']),
        erro,
        ui.campo('Nome completo', nome),
        ui.campo('RA / matrícula', ra),
        ui.campo('E-mail de trabalho', email),
        ui.campo('Setor', setor),
        permissoes
      ],
      botoes: [
        ui.botao('Cancelar', { onClick: () => modal.fechar() }),
        ui.botao('Cadastrar e enviar acesso', { tipo: 'primario', onClick: async () => {
          erro.hidden = true;
          const dados = { nome: nome.value.trim(), ra: ra.value.trim(), email: email.value.trim().toLowerCase(), setor: setor.value };
          const problema = !dados.nome || dados.nome.length < 3 ? 'Informe o nome completo.'
            : !dados.ra ? 'Informe o RA / matrícula.'
            : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email) ? 'Informe um e-mail válido.' : '';
          if (problema) { erro.textContent = problema; erro.hidden = false; return; }
          try {
            await TI.dados.funcionarios.criarViaN8n(dados);
          } catch (err) { erro.textContent = err.message; erro.hidden = false; return; }
          await TI.dados.auditoria.registrar('funcionario.cadastrado', 'funcionario', null, { email: dados.email, setor: dados.setor });
          ui.toast('Convite enviado para ' + dados.email + '.');
          modal.fechar();
          if (aoCriar) aoCriar();
        } })
      ]
    });
    nome.focus();
  }
};
