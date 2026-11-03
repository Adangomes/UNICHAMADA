import { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

const TABELA_ITENS = 'unichamada_agenda_itens';
const TABELA_COFRES = 'unichamada_agenda_cofres';
const ITERACOES_KDF = 310000;
const CACHE_TTL_MS = 30000;
const TEXTO_VERIFICADOR = 'unichamada-agenda-chave-v1';
const ABAS = [
  ['hoje', 'Hoje'],
  ['tarefas', 'Tarefas'],
  ['notas', 'Notas'],
  ['calendario', 'Calendário']
];
const STATUS_TAREFA = [
  ['a_fazer', 'A fazer'],
  ['em_andamento', 'Em andamento'],
  ['aguardando', 'Aguardando'],
  ['concluida', 'Concluída'],
  ['cancelada', 'Cancelada']
];
const PRIORIDADES = [
  ['baixa', 'Baixa'],
  ['normal', 'Normal'],
  ['alta', 'Alta'],
  ['urgente', 'Urgente']
];

function bytesBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64Bytes(text) {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

function bytesHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexBytes(text) {
  return Uint8Array.from(text.match(/.{2}/g) || [], (byte) => parseInt(byte, 16));
}

async function derivarChave(segredo, saltHex) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(segredo),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: hexBytes(saltHex), iterations: ITERACOES_KDF, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function cifrar(texto, chave) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifra = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    chave,
    new TextEncoder().encode(texto)
  );
  return `v1.${bytesBase64(iv)}.${bytesBase64(new Uint8Array(cifra))}`;
}

async function decifrar(textoCifrado, chave) {
  const [versao, ivBase64, conteudoBase64] = String(textoCifrado).split('.');
  if (versao !== 'v1' || !ivBase64 || !conteudoBase64) {
    throw new Error('Conteúdo cifrado inválido ou em formato desconhecido.');
  }
  const bytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64Bytes(ivBase64) },
    chave,
    base64Bytes(conteudoBase64)
  );
  return new TextDecoder().decode(bytes);
}

function chaveCache(userId) {
  return `unichamada_agenda_cache_${userId}`;
}

function lerCache(userId) {
  try {
    const valor = JSON.parse(localStorage.getItem(chaveCache(userId)) || 'null');
    return valor && valor.expiraEm > Date.now() && Array.isArray(valor.itens)
      ? valor.itens
      : null;
  } catch (error) {
    console.warn('Cache criptografado da agenda inválido; será atualizado do Supabase.', error);
    return null;
  }
}

function salvarCache(userId, itens) {
  try {
    localStorage.setItem(chaveCache(userId), JSON.stringify({
      expiraEm: Date.now() + CACHE_TTL_MS,
      itens
    }));
  } catch (error) {
    console.warn('Não foi possível manter o cache criptografado da agenda.', error);
  }
}

function dataHoje() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
}

function formatarData(valor, opcoes = {}) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    ...opcoes
  }).format(data);
}

function dataLocal(valor) {
  const data = new Date(valor);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function dataHoraLocal(data, hora) {
  if (!data) return null;
  const dataHora = new Date(`${data}T${hora || '23:59'}:00`);
  return Number.isNaN(dataHora.getTime()) ? null : dataHora.toISOString();
}

function novaTarefa() {
  return {
    tipo: 'tarefa',
    titulo: '',
    descricao: '',
    data: '',
    hora: '',
    horaFim: '',
    status: 'a_fazer',
    prioridade: 'normal'
  };
}

async function idAgenda(perfil) {
  if (!perfil?.papel || perfil.id === undefined || perfil.id === null) {
    throw new Error('Não foi possível identificar seu perfil para abrir a agenda.');
  }
  const identidade = `${perfil.papel}:${perfil.id}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identidade));
  return bytesHex(new Uint8Array(digest));
}

function segredoAgenda(perfil) {
  const ra = String(perfil?.ra || '').trim().toUpperCase();
  if (perfil?.id === undefined || perfil.id === null) {
    throw new Error('Não foi possível gerar a chave da agenda porque o perfil não tem ID.');
  }
  const identificador = ra
    ? `ra:${ra}`
    : `perfil:${perfil.papel}:${perfil.id}`;
  return `unichamada-agenda:${identificador}:${perfil.id}`;
}

function Agenda({ perfil, cliente }) {
  const [usuario, setUsuario] = useState(null);
  const [configuracao, setConfiguracao] = useState(null);
  const [estado, setEstado] = useState('verificando');
  const [chave, setChave] = useState(null);
  const [itensCifrados, setItensCifrados] = useState([]);
  const [itens, setItens] = useState([]);
  const [aba, setAba] = useState('hoje');
  const [rascunho, setRascunho] = useState(novaTarefa());
  const [idEditando, setIdEditando] = useState(null);
  const [formAberto, setFormAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const nome = perfil.nome || 'Usuário';

  const decifrarItens = useCallback(async (linhas, chaveAtual) => Promise.all(
    linhas.map(async (linha) => ({
      ...linha,
      conteudo: JSON.parse(await decifrar(linha.conteudo_cifrado, chaveAtual))
    }))
  ), []);

  const sincronizarItens = useCallback(async (linhas, chaveAtual) => {
    setItensCifrados(linhas);
    setItens(await decifrarItens(linhas, chaveAtual));
    if (usuario?.id) salvarCache(usuario.id, linhas);
  }, [decifrarItens, usuario?.id]);

  useEffect(() => {
    let ativo = true;
    async function identificar() {
      try {
        if (!cliente?.from || !cliente?.channel) throw new Error('Cliente Supabase indisponível.');
        if (!crypto?.subtle || !window.isSecureContext) {
          throw new Error('A criptografia da agenda exige HTTPS ou o aplicativo UniChamada instalado.');
        }

        const ownerId = await idAgenda(perfil);
        const { data: config, error: configError } = await cliente
          .from(TABELA_COFRES)
          .select('owner_id, kdf_salt, verificador_cifrado')
          .eq('owner_id', ownerId)
          .maybeSingle();
        if (configError) throw configError;

        if (!ativo) return;
        setUsuario({ id: ownerId });
        setConfiguracao(config);
        setEstado(config ? 'desbloquear' : 'configurar');
      } catch (error) {
        console.error('Falha ao preparar a agenda:', error);
        if (ativo) {
          setErro(error.message || 'Não foi possível preparar a agenda.');
          setEstado('erro');
        }
      }
    }

    identificar();
    return () => { ativo = false; };
  }, [cliente, perfil]);

  const carregarItens = useCallback(async (forcar = false, chaveAtual = chave) => {
    if (!usuario || !chaveAtual) return;
    setErro('');
    setCarregando(true);
    try {
      const local = !forcar && lerCache(usuario.id);
      if (local) {
        await sincronizarItens(local, chaveAtual);
        return;
      }
      const { data, error } = await cliente
        .from(TABELA_ITENS)
        .select('id, owner_id, tipo, conteudo_cifrado, status, prioridade, inicio_em, fim_em, prazo_em, criado_em, atualizado_em')
        .eq('owner_id', usuario.id)
        .order('atualizado_em', { ascending: false })
        .limit(500);
      if (error) throw error;
      await sincronizarItens(data || [], chaveAtual);
      if ((data || []).length === 500) {
        setAviso('A agenda carregou os 500 itens mais recentes. Arquive ou remova itens antigos para manter a lista leve.');
      }
    } catch (error) {
      console.error('Falha ao carregar os itens da agenda:', error);
      setErro(error.message || 'Não foi possível carregar os itens da agenda.');
    } finally {
      setCarregando(false);
    }
  }, [chave, cliente, sincronizarItens, usuario]);

  useEffect(() => {
    if (!usuario || !chave) return undefined;
    carregarItens();
    const canal = cliente
      .channel(`unichamada-agenda-${usuario.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: TABELA_ITENS,
        filter: `owner_id=eq.${usuario.id}`
      }, () => carregarItens(true))
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Falha na atualização em tempo real da agenda:', error || status);
          setAviso('A sincronização em tempo real foi interrompida. Os dados salvos continuam no Supabase.');
        }
      });
    return () => { void cliente.removeChannel(canal); };
  }, [carregarItens, chave, cliente, usuario]);

  const listas = useMemo(() => {
    const hoje = dataHoje();
    const inicioHoje = new Date(`${hoje}T00:00:00`).getTime();
    const fimHoje = inicioHoje + 24 * 60 * 60 * 1000;
    const tarefas = itens.filter((item) => item.tipo === 'tarefa');
    const compromissos = itens.filter((item) => item.tipo === 'compromisso');
    const notas = itens.filter((item) => item.tipo === 'nota');
    return {
      hoje: [
        ...tarefas.filter((item) => item.status !== 'concluida' && item.status !== 'cancelada'
          && item.prazo_em && new Date(item.prazo_em).getTime() < fimHoje),
        ...compromissos.filter((item) => {
          const instante = new Date(item.inicio_em).getTime();
          return instante >= inicioHoje && instante < fimHoje;
        })
      ].sort((a, b) => new Date(a.prazo_em || a.inicio_em) - new Date(b.prazo_em || b.inicio_em)),
      tarefas,
      notas,
      calendario: [
        ...compromissos,
        ...tarefas.filter((item) => item.prazo_em)
      ].filter((item) => {
        const instante = new Date(item.inicio_em || item.prazo_em).getTime();
        return instante >= inicioHoje && instante < inicioHoje + 30 * 24 * 60 * 60 * 1000;
      })
        .sort((a, b) => new Date(a.inicio_em || a.prazo_em) - new Date(b.inicio_em || b.prazo_em))
    };
  }, [itens]);

  async function configurarOuDesbloquear(event) {
    event.preventDefault();
    setErro('');
    setAviso('');
    setCarregando(true);
    try {
      if (configuracao) {
        const chaveDerivada = await derivarChave(segredoAgenda(perfil), configuracao.kdf_salt);
        const verificador = await decifrar(configuracao.verificador_cifrado, chaveDerivada);
        if (verificador !== TEXTO_VERIFICADOR) {
          throw new Error('Não foi possível validar a chave da agenda. Confira se o RA e o ID do cadastro não foram alterados.');
        }
        setChave(chaveDerivada);
        setEstado('aberta');
      } else {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const saltHex = bytesHex(salt);
        const chaveDerivada = await derivarChave(segredoAgenda(perfil), saltHex);
        const verificadorCifrado = await cifrar(TEXTO_VERIFICADOR, chaveDerivada);
        const { data, error } = await cliente
          .from(TABELA_COFRES)
          .insert({
            owner_id: usuario.id,
            kdf_salt: saltHex,
            verificador_cifrado: verificadorCifrado
          })
          .select('owner_id, kdf_salt, verificador_cifrado')
          .single();
        if (error) {
          if (error.code === '23505') {
            throw new Error('A agenda foi configurada em outro dispositivo ao mesmo tempo. Atualize a página e tente novamente.');
          }
          throw error;
        }
        setConfiguracao(data);
        setChave(chaveDerivada);
        setEstado('aberta');
      }
    } catch (error) {
      console.error('Falha ao desbloquear a criptografia da agenda:', error);
      setErro(error.message || 'Não foi possível configurar a criptografia.');
    } finally {
      setCarregando(false);
    }
  }

  function bloquear() {
    setChave(null);
    setItens([]);
    setItensCifrados([]);
    setFormAberto(false);
    setEstado('desbloquear');
    setAviso('Agenda bloqueada. Conteúdos decifrados foram removidos da tela.');
  }

  function abrirNovo(tipo = 'tarefa') {
    setIdEditando(null);
    setRascunho({ ...novaTarefa(), tipo });
    setFormAberto(true);
    setErro('');
    setAviso('');
  }

  function editar(item) {
    const dataReferencia = item.prazo_em || item.inicio_em;
    setIdEditando(item.id);
    setRascunho({
      tipo: item.tipo,
      titulo: item.conteudo.titulo,
      descricao: item.conteudo.descricao,
      data: dataReferencia ? dataLocal(dataReferencia) : '',
      hora: item.inicio_em
        ? new Date(item.inicio_em).toTimeString().slice(0, 5)
        : item.prazo_em ? new Date(item.prazo_em).toTimeString().slice(0, 5) : '',
      horaFim: item.fim_em ? new Date(item.fim_em).toTimeString().slice(0, 5) : '',
      status: item.status || 'a_fazer',
      prioridade: item.prioridade || 'normal'
    });
    setFormAberto(true);
    setErro('');
    setAviso('');
  }

  async function salvarItem(event) {
    event.preventDefault();
    setErro('');
    const titulo = rascunho.titulo.trim();
    if (!titulo) {
      setErro('Informe um título ou assunto.');
      return;
    }
    if (rascunho.tipo === 'compromisso' && (!rascunho.data || !rascunho.hora)) {
      setErro('Informe a data e o horário do compromisso.');
      return;
    }
    if (rascunho.tipo === 'tarefa' && rascunho.hora && !rascunho.data) {
      setErro('Informe a data do prazo para usar um horário.');
      return;
    }

    setCarregando(true);
    try {
      const inicio = rascunho.tipo === 'compromisso'
        ? dataHoraLocal(rascunho.data, rascunho.hora)
        : null;
      let fim = rascunho.tipo === 'compromisso' && rascunho.horaFim
        ? dataHoraLocal(rascunho.data, rascunho.horaFim)
        : null;
      if (inicio && fim && new Date(fim) <= new Date(inicio)) {
        throw new Error('O horário final deve ser posterior ao início.');
      }
      if (inicio && !fim) fim = new Date(new Date(inicio).getTime() + 60 * 60 * 1000).toISOString();
      const prazo = rascunho.tipo === 'tarefa' && rascunho.data
        ? dataHoraLocal(rascunho.data, rascunho.hora)
        : null;
      const dados = {
        titulo,
        descricao: rascunho.descricao.trim()
      };
      const conteudoCifrado = await cifrar(JSON.stringify(dados), chave);
      const registro = {
        owner_id: usuario.id,
        tipo: rascunho.tipo,
        conteudo_cifrado: conteudoCifrado,
        status: rascunho.tipo === 'nota' ? null : rascunho.status,
        prioridade: rascunho.tipo === 'tarefa' ? rascunho.prioridade : null,
        inicio_em: inicio,
        fim_em: fim,
        prazo_em: prazo
      };

      let resposta;
      if (idEditando) {
        resposta = await cliente.from(TABELA_ITENS)
          .update(registro)
          .eq('id', idEditando)
          .eq('owner_id', usuario.id)
          .select('id, owner_id, tipo, conteudo_cifrado, status, prioridade, inicio_em, fim_em, prazo_em, criado_em, atualizado_em')
          .single();
      } else {
        resposta = await cliente.from(TABELA_ITENS)
          .insert(registro)
          .select('id, owner_id, tipo, conteudo_cifrado, status, prioridade, inicio_em, fim_em, prazo_em, criado_em, atualizado_em')
          .single();
      }
      if (resposta.error) throw resposta.error;
      const linhas = idEditando
        ? itensCifrados.map((item) => item.id === idEditando ? resposta.data : item)
        : [resposta.data, ...itensCifrados];
      await sincronizarItens(linhas, chave);
      setFormAberto(false);
      setIdEditando(null);
      setRascunho(novaTarefa());
      setAviso(idEditando ? 'Alterações salvas.' : 'Item salvo e sincronizado.');
    } catch (error) {
      console.error('Falha ao salvar item da agenda:', error);
      setErro(error.message || 'Não foi possível salvar. Verifique a conexão e tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  async function alterarStatus(item, status) {
    setErro('');
    try {
      const { data, error } = await cliente.from(TABELA_ITENS)
        .update({ status })
        .eq('id', item.id)
        .eq('owner_id', usuario.id)
        .select('id, owner_id, tipo, conteudo_cifrado, status, prioridade, inicio_em, fim_em, prazo_em, criado_em, atualizado_em')
        .single();
      if (error) throw error;
      await sincronizarItens(
        itensCifrados.map((linha) => linha.id === item.id ? data : linha),
        chave
      );
    } catch (error) {
      console.error('Falha ao atualizar status da agenda:', error);
      setErro(error.message || 'Não foi possível atualizar o status.');
    }
  }

  async function remover(item) {
    if (!window.confirm(`Apagar "${item.conteudo.titulo}"? Essa ação não pode ser desfeita.`)) return;
    setErro('');
    try {
      const { data, error } = await cliente.from(TABELA_ITENS)
        .delete()
        .eq('id', item.id)
        .eq('owner_id', usuario.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('O item não foi removido; atualize a agenda e tente novamente.');
      await sincronizarItens(itensCifrados.filter((linha) => linha.id !== item.id), chave);
    } catch (error) {
      console.error('Falha ao remover item da agenda:', error);
      setErro(error.message || 'Não foi possível apagar o item.');
    }
  }

  if (estado === 'verificando') {
    return <section className="agenda"><p className="agenda-estado">Preparando sua agenda...</p></section>;
  }

  if (estado === 'erro') {
    return (
      <section className="agenda">
        <header className="agenda-cabecalho"><div><p>AGENDA</p><h1>Agenda</h1></div></header>
        <p className="agenda-feedback erro" role="alert">{erro}</p>
      </section>
    );
  }

  if (estado === 'configurar' || estado === 'desbloquear') {
    return (
      <section className="agenda agenda-seguranca">
        <header className="agenda-cabecalho">
          <div><p>AGENDA</p><h1>{estado === 'configurar' ? 'Proteja suas anotações' : 'Desbloquear agenda'}</h1></div>
        </header>
        <form className="agenda-cartao agenda-form-seguranca" onSubmit={configurarOuDesbloquear}>
          <p>
            {estado === 'configurar'
              ? 'A chave será gerada automaticamente usando seu RA e ID, se houver RA no cadastro. Para perfis sem RA, será usado o ID do perfil.'
              : 'A chave é gerada automaticamente com os dados do perfil.'}
          </p>
          <p className="agenda-privacidade">
            Use o mesmo cadastro nos dispositivos em que abrir a agenda. Se o RA ou ID mudar, os textos cifrados podem ficar irrecuperáveis.
          </p>
          <p className="agenda-privacidade">
            RA e ID não são segredos. Quem acessar os dados do Supabase poderá tentar decifrar os textos e também poderá alterá-los ou apagá-los. Essa opção prioriza praticidade, não oferece proteção forte contra alguém com acesso ao projeto.
          </p>
          {erro && <p className="agenda-feedback erro" role="alert">{erro}</p>}
          {aviso && <p className="agenda-feedback">{aviso}</p>}
          <button className="agenda-botao primario" type="submit" disabled={carregando}>
            {carregando ? 'Protegendo...' : estado === 'configurar' ? 'Ativar agenda' : 'Abrir agenda'}
          </button>
        </form>
      </section>
    );
  }

  const itensVisiveis = listas[aba] || [];

  function cartao(item) {
    const compromisso = item.tipo === 'compromisso';
    const nota = item.tipo === 'nota';
    const dataItem = item.inicio_em || item.prazo_em;
    return (
      <article className={`agenda-item tipo-${item.tipo}`} key={item.id}>
        <div className="agenda-item-conteudo">
          <div className="agenda-item-meta">
            <span>{compromisso ? 'Compromisso' : nota ? 'Nota' : 'Tarefa'}</span>
            {dataItem && <time>{formatarData(dataItem, compromisso ? { timeStyle: 'short' } : {})}</time>}
            {item.prioridade && <span className={`prioridade ${item.prioridade}`}>{item.prioridade}</span>}
          </div>
          <h3>{item.conteudo.titulo}</h3>
          {item.conteudo.descricao && <p>{item.conteudo.descricao}</p>}
          {compromisso && item.fim_em && <small>Até {formatarData(item.fim_em, { timeStyle: 'short' })}</small>}
        </div>
        <div className="agenda-item-acoes">
          {!nota && (
            <select
              aria-label={`Status de ${item.conteudo.titulo}`}
              value={item.status || 'a_fazer'}
              onChange={(event) => alterarStatus(item, event.target.value)}
            >
              {STATUS_TAREFA.map(([valor, rotulo]) => <option value={valor} key={valor}>{rotulo}</option>)}
            </select>
          )}
          <button type="button" className="agenda-link" onClick={() => editar(item)}>Editar</button>
          <button type="button" className="agenda-link perigo" onClick={() => remover(item)}>Apagar</button>
        </div>
      </article>
    );
  }

  return (
    <section className="agenda">
      <header className="agenda-cabecalho">
        <div><p>AGENDA</p><h1>Olá, {nome}</h1></div>
        <div className="agenda-acoes-topo">
        <button type="button" className="agenda-botao" onClick={bloquear}>Bloquear agenda</button>
        </div>
      </header>

      <nav className="agenda-abas" aria-label="Seções da agenda">
        {ABAS.map(([id, rotulo]) => (
          <button
            type="button"
            className={aba === id ? 'ativo' : ''}
            aria-current={aba === id ? 'page' : undefined}
            key={id}
            onClick={() => { setAba(id); setFormAberto(false); setErro(''); }}
          >
            {rotulo}
          </button>
        ))}
        <button type="button" className="agenda-botao primario" onClick={() => abrirNovo(aba === 'notas' ? 'nota' : aba === 'calendario' ? 'compromisso' : 'tarefa')}>
          + Novo item
        </button>
      </nav>

      {erro && <p className="agenda-feedback erro" role="alert">{erro}</p>}
      {aviso && <p className="agenda-feedback" role="status">{aviso}</p>}

      {formAberto && (
        <form className="agenda-cartao agenda-form-item" onSubmit={salvarItem}>
          <div className="agenda-form-cabecalho">
            <h2>{idEditando ? 'Editar item' : 'Novo item'}</h2>
            <button type="button" className="agenda-link" onClick={() => setFormAberto(false)}>Fechar</button>
          </div>
          <label>Tipo
            <select value={rascunho.tipo} onChange={(event) => setRascunho({ ...rascunho, tipo: event.target.value })} disabled={Boolean(idEditando)}>
              <option value="tarefa">Tarefa</option>
              <option value="nota">Nota rápida</option>
              <option value="compromisso">Compromisso</option>
            </select>
          </label>
          <label>Título ou assunto
            <input maxLength={160} value={rascunho.titulo} onChange={(event) => setRascunho({ ...rascunho, titulo: event.target.value })} required />
          </label>
          <label>Descrição / anotação
            <textarea maxLength={12000} rows={4} value={rascunho.descricao} onChange={(event) => setRascunho({ ...rascunho, descricao: event.target.value })} />
          </label>
          {rascunho.tipo !== 'nota' && (
            <div className="agenda-form-linha">
              <label>{rascunho.tipo === 'compromisso' ? 'Data' : 'Prazo (opcional)'}
                <input type="date" value={rascunho.data} onChange={(event) => setRascunho({ ...rascunho, data: event.target.value })} required={rascunho.tipo === 'compromisso'} />
              </label>
              <label>{rascunho.tipo === 'compromisso' ? 'Início' : 'Horário (opcional)'}
                <input type="time" value={rascunho.hora} onChange={(event) => setRascunho({ ...rascunho, hora: event.target.value })} required={rascunho.tipo === 'compromisso'} />
              </label>
              {rascunho.tipo === 'compromisso' && (
                <label>Fim (opcional)
                  <input type="time" value={rascunho.horaFim} onChange={(event) => setRascunho({ ...rascunho, horaFim: event.target.value })} />
                </label>
              )}
            </div>
          )}
          {rascunho.tipo !== 'nota' && (
            <div className="agenda-form-linha">
              <label>Status
                <select value={rascunho.status} onChange={(event) => setRascunho({ ...rascunho, status: event.target.value })}>
                  {STATUS_TAREFA.map(([valor, rotulo]) => <option value={valor} key={valor}>{rotulo}</option>)}
                </select>
              </label>
              {rascunho.tipo === 'tarefa' && (
                <label>Prioridade
                  <select value={rascunho.prioridade} onChange={(event) => setRascunho({ ...rascunho, prioridade: event.target.value })}>
                    {PRIORIDADES.map(([valor, rotulo]) => <option value={valor} key={valor}>{rotulo}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
          <div className="agenda-form-acoes">
            <button type="button" className="agenda-botao" onClick={() => setFormAberto(false)}>Cancelar</button>
            <button type="submit" className="agenda-botao primario" disabled={carregando}>{carregando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      )}

      <section className="agenda-lista" aria-live="polite">
        <div className="agenda-lista-cabecalho">
          <h2>{ABAS.find(([id]) => id === aba)?.[1]}</h2>
          <span>{itensVisiveis.length} {itensVisiveis.length === 1 ? 'item' : 'itens'}</span>
        </div>
        {carregando && itensVisiveis.length === 0
          ? <p className="agenda-vazio">Carregando...</p>
          : itensVisiveis.length
            ? <div className="agenda-itens">{itensVisiveis.map(cartao)}</div>
            : <div className="agenda-vazio">
              <strong>{aba === 'hoje' ? 'Seu dia está livre.' : `Ainda não há ${aba === 'tarefas' ? 'tarefas' : aba === 'notas' ? 'notas' : 'compromissos'} aqui.`}</strong>
              <span>Use “Novo item” para adicionar algo à sua agenda.</span>
            </div>}
      </section>
    </section>
  );
}

window.UnichamadaAgenda = {
  mount(container, perfil, cliente) {
    const root = createRoot(container);
    root.render(<Agenda perfil={perfil} cliente={cliente} />);
    return () => root.unmount();
  }
};
