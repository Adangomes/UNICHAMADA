# Política de Segurança

## Versões suportadas

| Versão | Suporte |
| --- | --- |
| 2.x | Sim |
| < 2.0 | Não (usava localStorage) |

## Reportando uma vulnerabilidade

**Não abra issue pública** para falhas de segurança. Use o recurso de *Private vulnerability reporting* / *Security Advisories* do repositório: <https://github.com/Adangomes/UNICHAMADA/security>.

Inclua, se possível: descrição, passos para reproduzir, impacto e sugestão de correção. Responderemos assim que possível.

## Pontos sensíveis do projeto

- **Chaves do Supabase:** apenas a chave pública (anon) pode estar no front-end. A `service_role` nunca deve ser versionada nem exposta.
- **RLS:** toda tabela com dados de alunos, professores e presenças deve ter Row Level Security habilitado.
- **Presença:** a validação depende do token rotativo, do raio de geolocalização e do face-id; falhas que permitam burlar essas etapas são consideradas vulnerabilidades.
- **Dados pessoais:** RA, e-mail e foto dos alunos são dados pessoais; trate-os conforme a LGPD.
- **Webhook/n8n:** proteja a URL do webhook com segredo e não a publique no repositório. Em desenvolvimento local, ngrok expõe o n8n à internet: use apenas durante os testes.
