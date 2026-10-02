# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [0.2.0] - 2026-10-01

### Added
- **Orquestração de Automações via n8n:** Implementação da camada de workflow automation utilizando n8n conteinerizado via Docker para processamento assíncrono de eventos e fluxos de integração.
- **Configuração de Runtime Local:** Adicionados perfis de variáveis de ambiente (`.env.example`) e volumes persistentes para garantir o isolamento de dados do container.

### Changed
- **Refatoração da Estrutura do Repositório:** Reorganização do layout de diretórios para acomodar módulos de integração e documentação técnica padronizada.
