# Changelog

## [1.0.0] - 2026-10-17
### Adicionado
- Migração completa da arquitetura monolítica HTML para componente **React 100% modular**.
- Implementação do serviço de integração com **Supabase**.
- Isolamento de estilos globais em `src/assets/css/global.css`.
- Criação da documentação técnica e controle de rotinas na pasta `skills/`.

# Changelog - Totem de Ponto

Todas as mudanças notáveis e marcos de desenvolvimento deste projeto serão documentados neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-10-17

### Adicionado
- **Arquitetura 100% React (Vite):** Estruturação modular do projeto separando componentes visuais, serviços de backend e estilos globais.
- **Módulo de Leitura de QR Code (`ScannerTotem.jsx`):** Integração com a biblioteca `jsQR` e captura em tempo real do feed de vídeo da webcam frontal do totem usando `getUserMedia`, `autoPlay` e `muted`.
- **Conexão Nativa com o Supabase (`supabaseClient.js`):** Configuração do cliente oficial utilizando variáveis de ambiente seguras (`.env`), sem dependência de `localStorage` para garantir segurança em terminais compartilhados.
- **Lógica de Validação e Registro de Ponto:** 
  - Consulta ao banco do Supabase para verificar o hash do crachá do funcionário.
  - Validação de status ativo/inativo do colaborador.
  - Inserção síncrona do registro de ponto com timestamp na tabela `registros_ponto`.
  - Mecanismo de *cooldown* de 3 segundos para impedir múltiplos disparos de leitura rápida.
- **Estilização de Alta Visibilidade (`global.css`):** Tema escuro corporativo otimizado para telas de terminais e totens.
- **Documentação Operacional na Pasta `skills/`:**
  - `SKILL.md`: Diretrizes e padrões arquiteturais do totem.
  - `fluxo-banco.md`: Documentação das tabelas e relacionamentos necessários no Supabase.
  - `CHANGELOG.md`: Registro diário das evoluções do projeto.