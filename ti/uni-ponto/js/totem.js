const resposta = await fetch('/ti/uni-ponto/registrar', { ... })
```[cite: 12]

O teu JavaScript está a fazer um `fetch` diretamente para o endpoint reltivo `/ti/uni-ponto/registrar`[cite: 12]! 

Se a página do totem está a correr a partir de uma aplicação CSP mapeada (por exemplo, `/totem/totem.csp` ou `/uni-ponto/totem.csp`), o navegador vai tentar procurar a rota `POST` em `/totem/ti/uni-ponto/registrar` e vai dar **404 / Erro de ligação**, porque a tua API REST vive na aplicação web dedicada `/ti/uni-ponto`[cite: 8]!

### Como resolver isto definitivamente de forma elegante:

Podes atualizar a linha do `fetch` no teu `totem.js` para apontar diretamente com o IP/Porta absolutos do Docker ou usar o caminho completo da API REST, assim:

```javascript
const resposta = await fetch('http://192.168.0.157:52773/ti/uni-ponto/registrar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        funcionarioId: funcionarioId,
        dispositivoId: 'TOTEM-TABLET-01'
    })
});
```[cite: 12]

Como a tua classe REST `Ponto.TI.Service` já tem o CORS 100% liberado (`Access-Control-Allow-Origin: *`)[cite: 11], o navegador vai aceitar o pedido com zero conflitos de domínio!

Atualiza isso no teu ficheiro local, copia de novo para dentro do container com o `docker cp` e abre a p*rra da tela do totem. Vai funcionar de primeira!
