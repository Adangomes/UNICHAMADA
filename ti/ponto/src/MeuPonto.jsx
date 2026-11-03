import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as faceapi from '@vladmandic/face-api';

const TIPOS_BATIDA = [
  ['entrada', 'Registrar entrada'],
  ['inicio_intervalo', 'Iniciar intervalo'],
  ['fim_intervalo', 'Voltar do intervalo'],
  ['saida', 'Registrar saída']
];
const DISTANCIA_MAXIMA_ROSTO = 0.5;
let modelosCarregando;

function carregarModelosFaciais() {
  if (!modelosCarregando) {
    const modelos = window.location.protocol === 'file:'
      ? 'unichamada-models://models/'
      : new URL('ponto/models/', window.location.href).href;
    modelosCarregando = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelos),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelos),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelos)
    ]);
  }
  return modelosCarregando;
}

function carregarImagem(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const imagem = new Image();
    imagem.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imagem);
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a foto de referência.'));
    };
    imagem.src = url;
  });
}

async function obterDescritor(imagem) {
  const faces = await faceapi
    .detectAllFaces(imagem, new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5
    }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (faces.length !== 1) {
    throw new Error(
      faces.length === 0
        ? 'Não foi possível identificar um rosto. Ajuste a iluminação e tente novamente.'
        : 'A imagem precisa mostrar apenas o rosto do funcionário.'
    );
  }
  return faces[0].descriptor;
}

function dataLocalISO(data = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(data);
  const parte = (tipo) => partes.find((item) => item.type === tipo)?.value;
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
}

function formatarHorario(data, segundos = false) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    ...(segundos ? { second: '2-digit' } : {})
  }).format(data);
}

function formatarDuracao(milissegundos) {
  const minutos = Math.max(0, Math.floor(milissegundos / 60000));
  return `${Math.floor(minutos / 60)}h ${String(minutos % 60).padStart(2, '0')}min`;
}

function resumirJornada(registros, agora = new Date()) {
  const ordenados = [...registros].sort(
    (a, b) => new Date(a.registrado_em) - new Date(b.registrado_em)
  );
  let cursor = null;
  let trabalhadoMs = 0;
  let status = 'Sem entrada';
  let encerrada = false;
  let entradaEm = null;
  let temIntervalo = false;

  ordenados.forEach((registro) => {
    const instante = new Date(registro.registrado_em).getTime();
    if (registro.tipo === 'entrada') {
      cursor = instante;
      entradaEm = instante;
      status = 'Em serviço';
    } else if (registro.tipo === 'inicio_intervalo') {
      temIntervalo = true;
      if (cursor !== null) trabalhadoMs += Math.max(0, instante - cursor);
      cursor = null;
      status = 'No intervalo';
    } else if (registro.tipo === 'fim_intervalo') {
      cursor = instante;
      status = 'Em serviço';
    } else if (registro.tipo === 'saida') {
      if (cursor !== null) trabalhadoMs += Math.max(0, instante - cursor);
      cursor = null;
      status = 'Jornada encerrada';
      encerrada = true;
    }
  });

  const almocoEstimado = encerrada && !temIntervalo && entradaEm !== null
    && trabalhadoMs > 6 * 60 * 60 * 1000;
  if (almocoEstimado) trabalhadoMs -= 60 * 60 * 1000;

  if (cursor !== null && ordenados[0]?.data_local === dataLocalISO(agora)) {
    trabalhadoMs += Math.max(0, agora.getTime() - cursor);
  }
  return {
    status,
    trabalhadoMs,
    saldoMs: trabalhadoMs - 8 * 60 * 60 * 1000,
    encerrada,
    almocoEstimado
  };
}

function GestaoPonto({ funcionarioSessao }) {
  const hoje = dataLocalISO();
  const primeiroDiaMes = `${hoje.slice(0, 7)}-01`;
  const [funcionarios, setFuncionarios] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [registrosHoje, setRegistrosHoje] = useState([]);
  const [inicio, setInicio] = useState(primeiroDiaMes);
  const [fim, setFim] = useState(hoje);
  const [funcionarioFiltro, setFuncionarioFiltro] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [idAjuste, setIdAjuste] = useState('');
  const [dataAjuste, setDataAjuste] = useState(hoje);
  const [horaAjuste, setHoraAjuste] = useState('');
  const [tipoAjuste, setTipoAjuste] = useState('entrada');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [agora, setAgora] = useState(new Date());

  async function carregar(semCache = false) {
    setCarregando(true);
    setErro('');
    try {
      if (!inicio || !fim || inicio > fim) {
        throw new Error('Informe um período válido para a consulta.');
      }
      const diasConsultados = (Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`))
        / (24 * 60 * 60 * 1000);
      if (diasConsultados > 31) {
        throw new Error('Consulte no máximo 32 dias por vez para manter a pesquisa rápida.');
      }
      if (!funcionarios) {
        const [listaFuncionarios, listaRegistros, listaHoje] = await Promise.all([
          TI.dados.funcionarios.listar(),
          TI.dados.ponto.listar(inicio, fim, funcionarioFiltro || null, semCache),
          TI.dados.ponto.listar(hoje, hoje, null, semCache)
        ]);
        setFuncionarios(listaFuncionarios);
        setRegistros(listaRegistros);
        setRegistrosHoje(listaHoje);
      } else {
        const [listaRegistros, listaHoje] = await Promise.all([
          TI.dados.ponto.listar(inicio, fim, funcionarioFiltro || null, semCache),
          TI.dados.ponto.listar(hoje, hoje, null, semCache)
        ]);
        setRegistros(listaRegistros);
        setRegistrosHoje(listaHoje);
      }
    } catch (falha) {
      console.error('Falha ao carregar o painel de ponto:', falha);
      setErro(falha.message || 'Não foi possível carregar as informações do ponto.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [inicio, fim, funcionarioFiltro]);

  useEffect(() => {
    let ativo = true;
    const canal = TI.db
      .channel('ti-ponto-tempo-real')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ti_ponto_trabalho' },
        () => {
          TI.dados.ponto.limparCache();
          void carregar(true);
        }
      )
      .subscribe((status, falha) => {
        if (!ativo || (status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT')) return;
        console.error('Falha na atualização em tempo real do ponto:', falha || status);
        setErro('A atualização em tempo real foi interrompida. Use Atualizar para buscar os dados novamente.');
      });

    return () => {
      ativo = false;
      void TI.db.removeChannel(canal);
    };
  }, [inicio, fim, funcionarioFiltro]);

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const funcionariosAtivos = (funcionarios || []).filter((item) => item.ativo);
  const idsComEntrada = new Set(
    registrosHoje.filter((registro) => registro.tipo === 'entrada')
      .map((registro) => registro.funcionario_id)
  );
  const estadosHoje = funcionariosAtivos.map((pessoa) => ({
    pessoa,
    eventos: registrosHoje
      .filter((registro) => registro.funcionario_id === pessoa.id)
      .sort((a, b) => new Date(b.registrado_em) - new Date(a.registrado_em)),
    resumo: resumirJornada(
      registrosHoje.filter((registro) => registro.funcionario_id === pessoa.id),
      agora
    )
  }));
  const presentes = estadosHoje.filter((item) => idsComEntrada.has(item.pessoa.id)).length;
  const emIntervalo = estadosHoje.filter((item) => item.resumo.status === 'No intervalo').length;
  const encerradas = estadosHoje.filter((item) => item.resumo.encerrada).length;
  const ausentes = Math.max(0, funcionariosAtivos.length - presentes);

  const grupos = new Map();
  registros.forEach((registro) => {
    const chave = `${registro.funcionario_id}_${registro.data_local}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(registro);
  });
  const funcionariosPorId = new Map((funcionarios || []).map((pessoa) => [pessoa.id, pessoa]));
  const jornadas = [...grupos.entries()].map(([chave, eventos]) => {
    const [funcionarioId, data] = chave.split('_');
    return {
      funcionario: funcionariosPorId.get(funcionarioId),
      data,
      eventos: eventos.sort((a, b) => new Date(a.registrado_em) - new Date(b.registrado_em)),
      resumo: resumirJornada(eventos, agora)
    };
  }).filter((jornada) => jornada.funcionario).filter((jornada) => {
    const termo = filtroTexto.trim().toLowerCase();
    return !termo || jornada.funcionario.nome.toLowerCase().includes(termo)
      || (jornada.funcionario.id_funcionarios || '').toLowerCase().includes(termo);
  }).sort((a, b) => b.data.localeCompare(a.data)
    || a.funcionario.nome.localeCompare(b.funcionario.nome, 'pt-BR'));

  function exportarCSV() {
    if (!jornadas.length) {
      setAviso('Não há registros no período para exportar.');
      return;
    }
    const celula = (valor) => `"${String(valor ?? '').replaceAll('"', '""')}"`;
    const linhas = [
      ['ID crachá', 'Funcionário', 'Data', 'Batidas', 'Horas trabalhadas', 'Saldo vs 8h', 'Justificativas']
        .map(celula).join(';'),
      ...jornadas.map((jornada) => [
        jornada.funcionario.id_funcionarios,
        jornada.funcionario.nome,
        jornada.data,
        jornada.eventos.map((evento) =>
          `${evento.tipo.replaceAll('_', ' ')} ${formatarHorario(new Date(evento.registrado_em))}`
        ).join(' | '),
        formatarDuracao(jornada.resumo.trabalhadoMs),
        `${jornada.resumo.saldoMs < 0 ? '-' : '+'}${formatarDuracao(Math.abs(jornada.resumo.saldoMs))}`,
        jornada.eventos.filter((evento) => evento.justificativa)
          .map((evento) => evento.justificativa).join(' | ')
      ].map(celula).join(';'))
    ];
    const arquivo = new Blob([`\uFEFF${linhas.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8'
    });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apuracao-ponto-${inicio}-${fim}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setAviso('Arquivo CSV exportado.');
  }

  async function registrarAjuste(event) {
    event.preventDefault();
    setAviso('');
    const motivo = motivoAjuste.trim();
    if (motivo.length < 10) {
      setErro('Informe uma justificativa com pelo menos 10 caracteres.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      await TI.dados.ponto.ajustar({
        idFuncionarios: idAjuste.trim().toUpperCase(),
        data: dataAjuste,
        horario: horaAjuste,
        tipo: tipoAjuste,
        motivo
      });
      setMotivoAjuste('');
      setAviso('Ajuste registrado e incluído na auditoria.');
      await carregar(true);
    } catch (falha) {
      console.error('Falha ao registrar ajuste de ponto:', falha);
      setErro(falha.message || 'Não foi possível registrar o ajuste.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="ti-ponto ti-ponto-coordenacao" aria-labelledby="meu-ponto-titulo">
      <header className="ti-ponto-cabecalho">
        <div>
          <p className="ti-ponto-sobretitulo">JORNADA DA EQUIPE</p>
          <h1 id="meu-ponto-titulo">Gestão de ponto</h1>
        </div>
        <span className="ti-ponto-estado ok">Coordenação</span>
      </header>

      <MeuPonto funcionarioSessao={funcionarioSessao} somenteRegistro />

      <section className="ti-ponto-resumos" aria-label="Resumo de hoje">
        {[
          ['Funcionários ativos', funcionariosAtivos.length],
          ['Com entrada hoje', presentes],
          ['No intervalo', emIntervalo],
          ['Jornada encerrada', encerradas],
          ['Sem entrada', ausentes]
        ].map(([rotulo, valor]) => (
          <article className="ti-ponto-resumo" key={rotulo}>
            <span>{rotulo}</span>
            <strong>{carregando ? '…' : valor}</strong>
          </article>
        ))}
      </section>

      <section className="ti-ponto-painel" aria-labelledby="ti-ponto-hoje-titulo">
        <div className="ti-ponto-secao-cabecalho">
          <div>
            <h2 id="ti-ponto-hoje-titulo">Situação de hoje</h2>
            <p>Visão atual das batidas de todos os funcionários ativos.</p>
          </div>
        </div>
        <div className="ti-ponto-tabela-wrap">
          <table className="ti-ponto-tabela">
            <thead>
              <tr><th>Funcionário / ID</th><th>Situação</th><th>Última batida</th><th>Horas computadas</th></tr>
            </thead>
            <tbody>
              {estadosHoje.map(({ pessoa, eventos, resumo }) => (
                <tr key={pessoa.id}>
                  <td>{pessoa.nome}<small>{pessoa.id_funcionarios || 'Sem ID'}</small></td>
                  <td><span className={`ti-ponto-status ${resumo.status === 'No intervalo' ? 'intervalo' : resumo.status === 'Jornada encerrada' ? 'encerrada' : ''}`}>{resumo.status}</span></td>
                  <td>{eventos[0]
                    ? `${eventos[0].tipo.replaceAll('_', ' ')} · ${formatarHorario(new Date(eventos[0].registrado_em))}`
                    : '—'}</td>
                  <td>{formatarDuracao(resumo.trabalhadoMs)}{!resumo.encerrada && eventos.length > 0 && <small>parcial</small>}</td>
                </tr>
              ))}
              {!estadosHoje.length && (
                <tr><td colSpan="4">{carregando ? 'Carregando equipe…' : 'Nenhum funcionário ativo encontrado.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ti-ponto-painel" aria-labelledby="ti-ponto-consulta-titulo">
        <div className="ti-ponto-secao-cabecalho">
          <div>
            <h2 id="ti-ponto-consulta-titulo">Apuração e histórico</h2>
            <p>Jornada prevista: 8 horas trabalhadas por dia. O saldo é calculado pelas batidas registradas.</p>
          </div>
          <button type="button" onClick={exportarCSV} disabled={carregando || !jornadas.length}>
            Exportar CSV
          </button>
        </div>
        <div className="ti-ponto-filtros">
          <label>De
            <input type="date" value={inicio} max={fim} onChange={(e) => setInicio(e.target.value)} />
          </label>
          <label>Até
            <input type="date" value={fim} min={inicio} max={hoje} onChange={(e) => setFim(e.target.value)} />
          </label>
          <label>Funcionário
            <select value={funcionarioFiltro} onChange={(e) => setFuncionarioFiltro(e.target.value)}>
              <option value="">Todos</option>
              {(funcionarios || []).map((pessoa) => (
                <option key={pessoa.id} value={pessoa.id}>
                  {pessoa.id_funcionarios || 'Sem ID'} — {pessoa.nome}
                </option>
              ))}
            </select>
          </label>
          <label>Buscar por nome ou ID
            <input value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} placeholder="UC0100 ou nome" />
          </label>
          <button type="button" onClick={() => carregar(true)} disabled={carregando}>
            {carregando ? 'Carregando…' : 'Atualizar'}
          </button>
        </div>

        {erro && <p className="ti-ponto-feedback erro" role="alert">{erro}</p>}
        {aviso && <p className="ti-ponto-feedback ok" role="status">{aviso}</p>}
        {jornadas.length > 0 ? (
          <div className="ti-ponto-tabela-wrap">
            <table className="ti-ponto-tabela">
              <thead>
                <tr>
                  <th>Funcionário / ID</th><th>Dia</th><th>Batidas</th>
                  <th>Trabalhado</th><th>Saldo vs. 8h</th><th>Justificativas</th>
                </tr>
              </thead>
              <tbody>
                {jornadas.map((jornada) => (
                  <tr key={`${jornada.funcionario.id}-${jornada.data}`}>
                    <td>{jornada.funcionario.nome}<small>{jornada.funcionario.id_funcionarios || 'Sem ID'}</small></td>
                    <td>{new Intl.DateTimeFormat('pt-BR', {
                      timeZone: 'America/Sao_Paulo'
                    }).format(new Date(`${jornada.data}T12:00:00-03:00`))}</td>
                    <td>{jornada.eventos.map((evento) => (
                      <span className="ti-ponto-evento" key={evento.id}>
                        {evento.tipo.replaceAll('_', ' ')} · {formatarHorario(new Date(evento.registrado_em))}
                        {evento.origem === 'coordenador' && <b title="Ajuste manual da coordenação"> · Ajuste</b>}
                      </span>
                    ))}</td>
                    <td>
                      {formatarDuracao(jornada.resumo.trabalhadoMs)}
                      {jornada.resumo.almocoEstimado && <small>1h de almoço estimada</small>}
                    </td>
                    <td className={jornada.resumo.saldoMs < 0 ? 'negativo' : 'positivo'}>
                      {jornada.resumo.saldoMs < 0 ? '-' : '+'}{formatarDuracao(Math.abs(jornada.resumo.saldoMs))}
                      {!jornada.resumo.encerrada && jornada.data === hoje && <small>parcial</small>}
                    </td>
                    <td>{jornada.eventos.filter((evento) => evento.justificativa)
                      .map((evento) => evento.justificativa).join(' · ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ti-ponto-vazio">{carregando ? 'Consultando registros…' : 'Nenhum registro encontrado para os filtros.'}</p>
        )}
      </section>

      <section className="ti-ponto-painel" aria-labelledby="ti-ponto-ajuste-titulo">
        <div className="ti-ponto-secao-cabecalho">
          <div>
            <h2 id="ti-ponto-ajuste-titulo">Lançar ajuste manual</h2>
            <p>Use quando a batida precisar de correção. Todo lançamento exige motivo e entra na auditoria.</p>
          </div>
        </div>
        <form className="ti-ponto-ajuste" onSubmit={registrarAjuste}>
          <label>ID do crachá
            <input required value={idAjuste} onChange={(e) => setIdAjuste(e.target.value)} placeholder="UC0100" />
          </label>
          <label>Dia
            <input required type="date" max={hoje} value={dataAjuste} onChange={(e) => setDataAjuste(e.target.value)} />
          </label>
          <label>Horário
            <input required type="time" value={horaAjuste} onChange={(e) => setHoraAjuste(e.target.value)} />
          </label>
          <label>Tipo de batida
            <select value={tipoAjuste} onChange={(e) => setTipoAjuste(e.target.value)}>
              {TIPOS_BATIDA.map(([tipo, nome]) => <option key={tipo} value={tipo}>{nome}</option>)}
            </select>
          </label>
          <label className="ti-ponto-motivo">Motivo / justificativa
            <textarea required minLength={10} value={motivoAjuste} onChange={(e) => setMotivoAjuste(e.target.value)} placeholder="Descreva por que o ajuste foi necessário (mínimo 10 caracteres)." />
          </label>
          <div className="ti-ponto-ajuste-rodape">
            <span>Entradas fora da janela normal também devem ser lançadas por aqui, com justificativa.</span>
            <button type="submit" className="primario" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Registrar ajuste'}
            </button>
          </div>
        </form>
      </section>

    </section>
  );
}

function MeuPonto({ funcionarioSessao, somenteRegistro = false }) {
  const [usuario, setUsuario] = useState(null);
  const [idCracha, setIdCracha] = useState(funcionarioSessao?.id_funcionarios || '');
  const [funcionario, setFuncionario] = useState(null);
  const [rostoVerificado, setRostoVerificado] = useState(false);
  const [erroSessao, setErroSessao] = useState('');
  const [mensagem, setMensagem] = useState('Digite o ID impresso no seu crachá para localizar seu cadastro.');
  const [tipoMensagem, setTipoMensagem] = useState('');
  const [stream, setStream] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [horario, setHorario] = useState(new Date());
  const videoRef = useRef(null);
  const tituloId = somenteRegistro ? 'ti-ponto-coordenador-titulo' : 'meu-ponto-titulo';

  useEffect(() => {
    let ativo = true;

    async function validarSessaoOuFuncionario() {
      try {
        const { data, error } = await window.TI.db.auth.getUser();
        if (!ativo) return;

        if (data?.user) {
          setUsuario(data.user);
          return;
        }

        // Fallback robusto: se a sessão nativa falhar mas o login corporativo ocorreu via RPC
        const funcionarioSalvo = localStorage.getItem('unichamada_ti_user');
        if (funcionarioSalvo) {
          const funcObj = JSON.parse(funcionarioSalvo);
          setUsuario({ id: funcObj.auth_user_id || funcObj.id, email: funcObj.email });
          if (!idCracha && funcObj.id_funcionarios) {
            setIdCracha(funcObj.id_funcionarios);
          }
          return;
        }

        setErroSessao('Entre no painel de TI com a conta do funcionário antes de registrar o ponto.');
      } catch (error) {
        if (ativo) setErroSessao(error.message || 'Não foi possível validar a sessão.');
      }
    }

    validarSessaoOuFuncionario();

    const timer = window.setInterval(() => setHorario(new Date()), 1000);
    return () => {
      ativo = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!stream || !videoRef.current) return undefined;
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch((error) => {
      setMensagem(`Não foi possível iniciar a prévia da câmera: ${error.message}`);
      setTipoMensagem('erro');
    });
    return () => stream.getTracks().forEach((track) => track.stop());
  }, [stream]);

  function notificar(texto, tipo = '') {
    setMensagem(texto);
    setTipoMensagem(tipo);
  }

  async function consultarFuncionario(event) {
    event?.preventDefault?.();
    setCarregando(true);
    setFuncionario(null);
    setRostoVerificado(false);
    setStream(null);
    notificar('Verificando o ID do crachá com o banco de dados…');

    try {
      const { data, error } = await window.TI.db.rpc('ti_buscar_funcionario_ponto', {
        p_id_funcionarios: idCracha.trim()
      });
      if (error) throw new Error(error.message || 'Falha ao consultar o ID do crachá.');

      const registro = Array.isArray(data) ? data[0] : data;
      if (!registro?.funcionario_id) {
        throw new Error('O ID do crachá não corresponde a um funcionário ativo desta sessão.');
      }

      setFuncionario(registro);
      notificar('Cadastro confirmado. Abra a câmera para comparar com a foto de referência.', 'ok');
    } catch (error) {
      console.error('Falha ao consultar funcionário pelo ID do crachá:', error);
      notificar(
        error.message === 'Failed to fetch'
          ? 'Não foi possível acessar o Supabase. Abra o painel pelo aplicativo ou pelo endereço HTTPS publicado.'
          : `Não foi possível confirmar o funcionário: ${error.message}`,
        'erro'
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (somenteRegistro && usuario && idCracha && !funcionario && !carregando) {
      consultarFuncionario();
    }
  }, [somenteRegistro, usuario, idCracha]);

  async function abrirCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      notificar('A câmera exige permissão e HTTPS ou o aplicativo Electron.', 'erro');
      return;
    }

    setRostoVerificado(false);
    setCarregando(true);
    try {
      const novaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user' }
      });
      setStream(novaStream);
      notificar('Enquadre o rosto e capture a foto para continuar.');
    } catch (error) {
      console.error('Falha ao abrir a câmera:', error);
      notificar(
        error.name === 'NotAllowedError'
          ? 'Permita o acesso à câmera nas configurações do dispositivo.'
          : `Não foi possível abrir a câmera: ${error.message}`,
        'erro'
      );
    } finally {
      setCarregando(false);
    }
  }

  async function verificarRosto() {
    const video = videoRef.current;
    if (!stream || !video?.videoWidth || !video?.videoHeight) {
      notificar('A câmera ainda está iniciando. Tente novamente em alguns segundos.', 'erro');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const contexto = canvas.getContext('2d');
    if (!contexto) {
      notificar('Não foi possível preparar a captura da foto.', 'erro');
      return;
    }
    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
    const captura = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!captura) {
      notificar('Não foi possível capturar a imagem para a conferência.', 'erro');
      return;
    }

    setCarregando(true);
    notificar('Comparando o rosto localmente com a foto de referência…');
    try {
      await carregarModelosFaciais();
      const { data: referencia, error } = await window.TI.db.storage
        .from('ti-fotos-funcionarios')
        .download(funcionario.foto_path);
      if (error) {
        throw new Error(`Não foi possível carregar a foto de referência: ${error.message}`);
      }

      const [imagemReferencia, imagemCapturada] = await Promise.all([
        carregarImagem(referencia),
        carregarImagem(captura)
      ]);
      const [descritorReferencia, descritorCapturado] = await Promise.all([
        obterDescritor(imagemReferencia),
        obterDescritor(imagemCapturada)
      ]);
      const distancia = faceapi.euclideanDistance(descritorReferencia, descritorCapturado);
      if (distancia > DISTANCIA_MAXIMA_ROSTO) {
        throw new Error('O rosto não corresponde à foto de referência. Tente novamente ou procure a coordenação.');
      }

      setRostoVerificado(true);
      notificar('Rosto compatível. A imagem foi conferida neste dispositivo e descartada; escolha a batida.', 'ok');
    } catch (error) {
      console.error('Falha na comparação local do rosto:', error);
      setRostoVerificado(false);
      notificar(
        error.message === 'Failed to fetch'
          ? 'Não foi possível carregar os modelos ou a foto de referência. Abra o painel pelo aplicativo ou pelo endereço HTTPS publicado.'
          : error.message || 'Não foi possível comparar as imagens.',
        'erro'
      );
    } finally {
      setStream(null);
      setCarregando(false);
    }
  }

  async function registrarPonto(tipo) {
    if (!usuario || !funcionario || !rostoVerificado) {
      notificar('Consulte o ID do crachá e valide o rosto antes de registrar a batida.', 'erro');
      return;
    }

    setCarregando(true);
    notificar('Enviando o registro de ponto ao Supabase…');
    try {
      const { data, error } = await window.TI.db.rpc('registrar_ponto', {
        p_id_funcionarios: idCracha.trim(),
        p_tipo: tipo
      });
      if (error) {
        throw new Error(error.message || 'O banco recusou o registro.');
      }

      const resultado = Array.isArray(data) ? data[0] : data;
      if (!resultado?.registrado_em) {
        throw new Error('O banco não confirmou a data e hora do registro.');
      }

      const horarioServidor = formatarHorario(new Date(resultado.registrado_em), true);
      setRostoVerificado(false);
      notificar(
        `Batida de ${tipo.replaceAll('_', ' ')} registrada às ${horarioServidor}. A imagem da conferência não foi salva. Valide o rosto novamente para a próxima batida.`,
        'ok'
      );
    } catch (error) {
      console.error('Falha ao registrar ponto:', error);
      notificar(`Não foi possível registrar o ponto: ${error.message}`, 'erro');
    } finally {
      setCarregando(false);
    }
  }

  if (erroSessao) {
    return (
      <section className={`ti-ponto${somenteRegistro ? ' ti-ponto-coord-batida' : ''}`} aria-labelledby={tituloId}>
        <header className="ti-ponto-cabecalho">
          <div>
            <p className="ti-ponto-sobretitulo">REGISTRO DE JORNADA</p>
            <h1 id={tituloId}>Meu ponto</h1>
          </div>
          <span className="ti-ponto-estado erro">Sessão necessária</span>
        </header>
        <p className="ti-ponto-mensagem erro" role="alert">{erroSessao}</p>
      </section>
    );
  }

  return (
    <section
      className={`ti-ponto${somenteRegistro ? ' ti-ponto-coord-batida' : ''}`}
      aria-labelledby={tituloId}
    >
      <header className="ti-ponto-cabecalho">
        <div>
          <p className="ti-ponto-sobretitulo">{somenteRegistro ? 'REGISTRO INDIVIDUAL' : 'REGISTRO DE JORNADA'}</p>
          <h1 id={tituloId}>{somenteRegistro ? 'Bater meu ponto' : 'Meu ponto'}</h1>
        </div>
        <span className={`ti-ponto-estado${usuario ? ' ok' : ''}`}>
          {usuario ? 'Sessão autenticada' : 'Verificando…'}
        </span>
      </header>

      <div className="ti-ponto-horario">
        <p className="ti-ponto-relogio">
          {new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }).format(horario)}
        </p>
        <p className="ti-ponto-data">
          {new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }).format(horario)}
        </p>
      </div>

      {funcionario && (
        <div className="ti-ponto-funcionario">
          <strong>{funcionario.nome}</strong>
          <span>ID do crachá {funcionario.id_funcionarios}</span>
        </div>
      )}

      {somenteRegistro && !idCracha && (
        <p className="ti-ponto-feedback erro" role="alert">
          Seu cadastro não tem ID de crachá. Peça à coordenação para regularizar o cadastro antes de bater o ponto.
        </p>
      )}

      {!somenteRegistro && (
        <div className="ti-ponto-aviso" role="note">
          <strong>Conferência facial</strong>
          <p>A foto cadastrada é usada como referência. A imagem da câmera é comparada neste dispositivo e descartada; nenhuma foto da batida é enviada ou armazenada. A entrada normal é permitida das 06:00 às 13:15; o almoço pode começar às 11:00, 12:00, 13:00 ou 14:00 e dura pelo menos uma hora. Fora dessas regras, procure a coordenação. Esta comparação não inclui detecção de vivacidade.</p>
        </div>
      )}

      {!somenteRegistro && (
        <form className="ti-ponto-form-id" onSubmit={consultarFuncionario}>
          <label htmlFor="ti-ponto-id-funcionario">ID do crachá</label>
          <div className="ti-ponto-linha-id">
            <input
              id="ti-ponto-id-funcionario"
              autoComplete="off"
              required
              value={idCracha}
              onChange={(event) => setIdCracha(event.target.value)}
              disabled={!usuario || carregando}
            />
            <button type="submit" disabled={!usuario || carregando}>
              {carregando ? 'Consultando…' : 'Confirmar ID'}
            </button>
          </div>
        </form>
      )}

      {funcionario && (
        <div className="ti-ponto-painel-camera">
          {!stream && !rostoVerificado && (
            <button type="button" className="ti-btn-camera" onClick={abrirCamera} disabled={carregando}>
              Abrir câmera para conferência facial
            </button>
          )}

          {stream && (
            <div className="ti-camera-container">
              <video ref={videoRef} playsInline muted />
              <button type="button" className="ti-btn-capturar" onClick={verificarRosto} disabled={carregando}>
                Capturar e conferir rosto
              </button>
            </div>
          )}

          {rostoVerificado && (
            <div className="ti-botoes-batida">
              <p className="ti-ponto-ok">Rosto verificado com sucesso! Escolha o tipo de batida:</p>
              <div className="ti-grid-batidas">
                {TIPOS_BATIDA.map(([tipo, rotulo]) => (
                  <button
                    key={tipo}
                    type="button"
                    className={`ti-btn-batida ${tipo}`}
                    onClick={() => registrarPonto(tipo)}
                    disabled={carregando}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mensagem && (
        <p className={`ti-ponto-mensagem ${tipoMensagem}`} role={tipoMensagem === 'erro' ? 'alert' : 'status'}>
          {mensagem}
        </p>
      )}
    </section>
  );
}
