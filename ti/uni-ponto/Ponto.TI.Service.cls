/// Classe REST corporativa para Gestão de Ponto (Totem / Facial / QR Code)
Class Ponto.TI.Service Extends %CSP.REST
{

Parameter CONETYPE = "application/json";

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
    <!-- Endpoint POST para registrar a batida de ponto -->
    <Route Url="/registrar" Method="POST" Call="RegistrarPonto"/>
    
    <!-- Endpoint GET para listar as marcações do dia -->
    <Route Url="/listar/:data" Method="GET" Call="ListarPontos"/>
</Routes>
}

/// Método executado antes de qualquer requisição para injetar regras globais (CORS)
ClassMethod OnPreDispatch(pUrl As %String, pMethod As %String, ByRef pContinue As %Boolean) As %Status
{
    Set %response.ContentType = "application/json"
    Set %response.Headers("Access-Control-Allow-Origin") = "*"
    Set %response.Headers("Access-Control-Allow-Methods") = "GET, POST, OPTIONS"
    Set %response.Headers("Access-Control-Allow-Headers") = "Content-Type, Authorization"
    
    If (pMethod = "OPTIONS") {
        Set %response.Status = 200
        Set pContinue = 0
    } Else {
        Set pContinue = 1
    }
    Quit $$$OK
}

/// Método responsável por validar, aplicar regras de negócio e persistir o ponto
ClassMethod RegistrarPonto() As %Status
{
    #dim ex As %Exception.AbstractException
    Set status = $$$OK
    
    Try {
        Set content = %request.Content
        If '$IsObject(content) || (content.Size = 0) {
            Set %response.Status = 400
            Write "{""status"":""erro"",""mensagem"":""Payload JSON vazio ou inválido.""}"
            Quit
        }
        
        Set data = ##class(%DynamicAbstractObject).%FromJSON(content)
        Set funcionarioId = data.%Get("funcionarioId")
        Set dispositivoId = data.%Get("dispositivoId")
        Set timestamp = data.%Get("timestamp")
        
        If (funcionarioId = "") {
            Set %response.Status = 400
            Write "{""status"":""erro"",""mensagem"":""O campo 'funcionarioId' é obrigatório.""}"
            Quit
        }
        
        If (timestamp = "") {
            Set dataHora = $ZDateTime($Horolog, 3)
        } Else {
            Set dataHora = timestamp
        }
        
        Set dataAtual = $P(dataHora, " ", 1)
        
        // Controle de concorrência estrito por colaborador
        Lock +^Ponto.Registro(dataAtual, funcionarioId):5
        If '$Test {
            Set %response.Status = 503
            Write "{""status"":""erro"",""mensagem"":""Sistema ocupado processando marcação simultânea. Tente novamente.""}"
            Quit
        }
        
        // Regra Anti-Duplo-Clique (1 minuto)
        Set seqUltimo = $O(^Ponto.Registro(dataAtual, funcionarioId, ""), -1)
        If (seqUltimo '= "") {
            Set dadosUltimo = ^Ponto.Registro(dataAtual, funcionarioId, seqUltimo)
            Set ultimaDataHora = $LG(dadosUltimo, 1)
            
            Set diffSegundos = $ZDateTimeH(dataHora, 3) - $ZDateTimeH(ultimaDataHora, 3)
            If (diffSegundos >= 0) && (diffSegundos < 60) {
                Lock -^Ponto.Registro(dataAtual, funcionarioId)
                Set %response.Status = 429
                Write "{""status"":""atencao"",""mensagem"":""Registro ignorado: você já bateu ponto há menos de 1 minuto.""}"
                Quit
            }
        }
        
        // Gravação atômica na Global
        Set seq = $I(^Ponto.Registro(dataAtual, funcionarioId))
        Set ^Ponto.Registro(dataAtual, funcionarioId, seq) = $LB(dataHora, dispositivoId, $H, $ZDateTime($H, 3))
        
        Lock -^Ponto.Registro(dataAtual, funcionarioId)
        
        // Retorno JSON de sucesso
        Set %response.Status = 200
        Set resp = ##class(%DynamicObject).%New()
        Set resp.status = "sucesso"
        Set resp.mensagem = "Ponto registrado com sucesso."
        Set resp.funcionarioId = funcionarioId
        Set resp.dataHora = dataHora
        Set resp.sequencial = seq
        Do resp.%ToJSON()
        
    } Catch ex {
        Set %response.Status = 500
        Set errorMsg = $ZCVT(ex.AsSmartString(), "O", "JSON")
        Write "{""status"":""erro"",""mensagem"":"_"""""_errorMsg_"""""_"}"
    }
    
    Quit status
}

/// Método GET para retornar os pontos do dia
ClassMethod ListarPontos(pData As %String) As %Status
{
    #dim ex As %Exception.AbstractException
    Set status = $$$OK
    
    Try {
        If (pData = "") {
            Set pData = $P($ZDateTime($H, 3), " ", 1)
        }
        
        Set arrayResult = ##class(%DynamicArray).%New()
        
        Set func = ""
        For {
            Set func = $O(^Ponto.Registro(pData, func))
            Quit:func=""
            
            Set seq = ""
            For {
                Set seq = $O(^Ponto.Registro(pData, func, seq))
                Quit:seq=""
                
                Set dados = ^Ponto.Registro(pData, func, seq)
                Set item = ##class(%DynamicObject).%New()
                Set item.funcionarioId = func
                Set item.dataHora = $LG(dados, 1)
                Set item.dispositivoId = $LG(dados, 2)
                Set item.registradoEm = $LG(dados, 4)
                
                Do arrayResult.%Push(item)
            }
        }
        
        Set %response.Status = 200
        Do arrayResult.%ToJSON()
        
    } Catch ex {
        Set %response.Status = 500
        Write "{""status"":""erro"",""mensagem"":""Erro ao listar pontos.""}"
    }
    
    Quit status
}

}