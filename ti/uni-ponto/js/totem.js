document.addEventListener("DOMContentLoaded", () => {
    // Monta o layout visual dinamicamente no body limpo
    const card = document.createElement("div");
    card.className = "card";
    
    card.innerHTML = `
        <h2>Registo de Ponto</h2>
        <p>Aproxime o cartão ou insira o ID</p>
        <input type="text" id="funcionarioId" placeholder="Ex: FUNC-001" autocomplete="off">
        <button id="btnPonto">Registar Ponto</button>
        <div id="mensagem"></div>
    `;
    
    document.body.appendChild(card);

    // Eventos de clique e tecla Enter
    document.getElementById("btnPonto").addEventListener("click", baterPonto);
    document.getElementById("funcionarioId").addEventListener("keypress", (e) => {
        if (e.key === "Enter") baterPonto();
    });
});

async function baterPonto() {
    const inputEl = document.getElementById('funcionarioId');
    const msgDiv = document.getElementById('mensagem');
    const funcionarioId = inputEl.value.trim();
    
    if (!funcionarioId) {
        msgDiv.style.color = '#f87171';
        msgDiv.innerText = 'Por favor, insira o ID do funcionário.';
        return;
    }

    try {
        const resposta = await fetch('/ti/uni-ponto/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                funcionarioId: funcionarioId,
                dispositivoId: 'TOTEM-TABLET-01'
            })
        });

        const resultado = await resposta.json();
        
        if (resposta.ok) {
            msgDiv.style.color = '#4ade80';
            msgDiv.innerText = resultado.mensagem || 'Ponto registado com sucesso!';
            inputEl.value = '';
        } else {
            msgDiv.style.color = '#f87171';
            msgDiv.innerText = resultado.mensagem || 'Atenção: Registo não efetuado.';
        }
    } catch (erro) {
        msgDiv.style.color = '#f87171';
        msgDiv.innerText = 'Erro de ligação ao servidor do IRIS.';
    }
}
