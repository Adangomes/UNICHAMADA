document.addEventListener("DOMContentLoaded", () => {
    const btnChamy = document.getElementById("btn-chamy");
    if (!btnChamy) return;

    // Injeta o HTML do modal do chat dinamicamente no body se não existir
    if (!document.getElementById("chamy-chat-modal")) {
        const chatHTML = `
            <div id="chamy-chat-modal" class="chamy-hidden">
                <div class="chamy-header">
                    <div class="chamy-header-info">
                        <img src="${btnChamy.querySelector('img').src}" alt="Chamy">
                        <h3>Chamy AI</h3>
                    </div>
                    <button id="chamy-close-btn">&times;</button>
                </div>
                <div id="chamy-body" class="chamy-body">
                    <div class="chamy-message assistant">Olá! Sou o Chamy, seu assistente de dados. O que você gostaria de saber sobre as turmas ou chamadas hoje?</div>
                </div>
                <div class="chamy-footer">
                    <input type="text" id="chamy-input" placeholder="Digite sua pergunta...">
                    <button id="chamy-send-btn"><i class="fas fa-paper-plane"></i>Enviar</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", chatHTML);
    }

    const modal = document.getElementById("chamy-chat-modal");
    const closeBtn = document.getElementById("chamy-close-btn");
    const sendBtn = document.getElementById("chamy-send-btn");
    const inputField = document.getElementById("chamy-input");
    const chatBody = document.getElementById("chamy-body");

    // Abre/fecha o chat clicando no ícone do customizado do lado do sino
    btnChamy.addEventListener("click", () => {
        modal.classList.toggle("chamy-hidden");
        if (!modal.classList.contains("chamy-hidden")) {
            inputField.focus();
        }
    });

    closeBtn.addEventListener("click", () => {
        modal.classList.add("chamy-hidden");
    });

    async function enviarMensagem() {
        const texto = inputField.value.trim();
        if (!texto) return;

        // Exibe mensagem do usuário
        appendMessage(texto, "user");
        inputField.value = "";
        chatBody.scrollTop = chatBody.scrollHeight;

        // Mensagem temporária de "Pensando..."
        const loadingId = appendMessage("Chamy está consultando os dados...", "assistant");

        try {
            // URL DO SEU WEBHOOK DO N8N AQUI 👇
            const webhookUrl = "SUA_URL_DO_WEBHOOK_N8N_AQUI"; 

            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ pergunta: texto })
            });

            const data = await response.json();
            
            // Remove o "pensando" e bota a resposta real
            document.getElementById(loadingId).remove();
            appendMessage(data.resposta || "Não consegui processar a resposta no momento.", "assistant");

        } catch (error) {
            console.error("Erro ao falar com o Chamy:", error);
            document.getElementById(loadingId).remove();
            appendMessage("Desculpe, ocorreu um erro de conexão com o servidor de IA.", "assistant");
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
});
