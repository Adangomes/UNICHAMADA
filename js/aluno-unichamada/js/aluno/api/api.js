// Camada única de acesso para aula ativa, chamada e perguntas.
// Se o nome do seu cliente Supabase for outro, ajuste SÓ em cliente().
window.AulaApi = (function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, "");

  function cliente() {
    const c = window.supabaseClient || window.sb || window.supabase;
    if (!c || typeof c.rpc !== "function") throw new Error("Cliente Supabase não encontrado: ajuste cliente() em js/aulas/api.js");
    return c;
  }

  async function rpc(nome, args) {
    const { data, error } = await cliente().rpc(nome, args);
    if (error) throw error;
    return data;
  }

  async function listar(tabela) {
    if (typeof dbListar !== "function") throw new Error("dbListar não encontrado");
    return (await dbListar(tabela)) || [];
  }

  function posicao() {
    return new Promise((ok, erro) => {
      if (!navigator.geolocation) return erro(new Error("Seu navegador não tem localização."));
      navigator.geolocation.getCurrentPosition(
        (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, precisao: p.coords.accuracy }),
        () => erro(new Error("Ative a localização para continuar.")),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  const igual = (a, b) => a != null && b != null && String(a) === String(b);

  return { esc, rpc, listar, posicao, igual };
})();
