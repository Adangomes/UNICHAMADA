function inicializarChamyProfessor(cabecalho, professor) {
    // 1. Pega o cabeçalho principal como referência para o posicionamento livre
    const cabecalhoPrincipal = cabecalho.closest('header') || cabecalho;

    // Evita duplicar o botão se já existir na tela
    if (document.getElementById("btn-chamy")) return;

    // 2. Cria o botão com o ícone customizado do Chamy
    const btnChamy = document.createElement("button");
    btnChamy.id = "btn-chamy";
    btnChamy.className = "chamy-trigger-btn";
    btnChamy.title = "Conversar com o Chamy";
    btnChamy.innerHTML = `<img src="js/professor/chamy/chamy.png" alt="Chamy" class="chamy-icon-img">`;
    
    // Insere diretamente no cabeçalho para flutuar livremente
    cabecalhoPrincipal.appendChild(btnChamy);

    // 3. Injeta o HTML do modal do chat flutuante no body se ainda não existir
    if (!document.getElementById("chamy-chat-modal")) {
        const chatHTML = `
            <div id="chamy-chat-modal" class="chamy-hidden">
                <div class="chamy-header">
                    <div class="chamy-header-info">
                        <h3>Chamy AI</h3>
                    </div>
                    <button id="chamy-close-btn">&times;</button>
                </div>
                <div id="chamy-body" class="chamy-body">
                    <div class="chamy-message assistant">Olá! Sou o Chamy, seu assistente de dados. O que gostaria de saber sobre as turmas ou chamadas hoje?</div>
                </div>
                <div class="chamy-footer">
                    <input type="text" id="chamy-input" placeholder="Digite sua pergunta...">
                    <button id="chamy-send-btn"><i class="fas fa-paper-plane"></i> Enviar</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", chatHTML);
    }

    // 4. Seleciona os elementos da interface do chat
    const modal = document.getElementById("chamy-chat-modal");
    const closeBtn = document.getElementById("chamy-close-btn");
    const sendBtn = document.getElementById("chamy-send-btn");
    const inputField = document.getElementById("chamy-input");
    const chatBody = document.getElementById("chamy-body");

    // 5. Configura os eventos de abrir/fechar
    btnChamy.addEventListener("click", () => {
        modal.classList.toggle("chamy-hidden");
        if (!modal.classList.contains("chamy-hidden")) {
            inputField.focus();
        }
    });

    closeBtn.addEventListener("click", () => {
        modal.classList.add("chamy-hidden");
    });

    // 6. Lógica de envio de mensagens para o n8n
    async function enviarMensagem() {
        const texto = inputField.value.trim();
        if (!texto) return;

        appendMessage(texto, "user");
        inputField.value = "";
        chatBody.scrollTop = chatBody.scrollHeight;

        const loadingId = appendMessage("Chamy está a consultar os dados...", "assistant");

        try {
            const webhookUrl = "SUA_URL_DO_WEBHOOK_N8N_AQUI"; 

            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ 
                    pergunta: texto,
                    professor_id: professor?.id || null 
                })
            });

            const data = await response.json();
            
            document.getElementById(loadingId).remove();
            appendMessage(data.resposta || "Não consegui processar a resposta no momento.", "assistant");

        } catch (error) {
            console.error("Erro ao falar com o Chamy:", error);
            document.getElementById(loadingId).remove();
            appendMessage("Desculpe, ocorreu um erro de ligação com o servidor de IA.", "assistant");
        }

        chatBody.scrollTop = chatBody.scrollHeight;
    }

    sendBtn.addEventListener("click", enviarMensagem);
    inputField.addEventListener("keypress", (e) => {
        if (e.key === "Enter") enviarMensagem();
    });

    function appendMessage(text, sender) {
        const msgDiv = document.createElement("div");
        const msgId = "msg-" + Date.now() + Math.random();
        msgDiv.id = msgId;
        msgDiv.className = `chamy-message ${sender}`;
        msgDiv.textContent = text;
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
        return msgId;
    }
}

window.inicializarChamyProfessor = inicializarChamyProfessor;
