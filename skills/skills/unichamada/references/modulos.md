# Mapa de módulos

```
.
├── index.html                    # SPA (entrada)
├── banco-de-dados/               # Scripts e definições do banco
├── css/
│   ├── base.css                  # Reset, variáveis (design tokens), componentes
│   ├── login.css                 # Tela de autenticação
│   └── painel.css                # Layout e grids dos painéis
└── js/
    ├── main.js                   # Roteamento e orquestração
    ├── data/db.js                # Camada de dados (Data Mapper) sobre o Supabase
    ├── auth/auth.js              # Sessão e contexto do usuário
    ├── utils/
    │   ├── helpers.js            # DOM, validações, alertas/toasts
    │   ├── camera.js             # API MediaDevices (webcam)
    │   └── cabecalho.js          # Cabeçalho dinâmico
    ├── coordenador/              # cursos, professores, alunos, disciplinas,
    │                             # turmas, matriculas, coordenador
    ├── professor/                # chamada, historico, telao, professor
    └── aluno/
        └── confirmar-presenca.js # Pipeline de validação da presença
```

## Convenções

- Um módulo por tela/entidade; o arquivo com o nome do perfil (`coordenador.js`, `professor.js`) monta a navegação daquele perfil.
- Funções de acesso a dados vivem em `db.js`; os módulos de tela apenas as chamam.
- Utilitários genéricos ficam em `js/utils/`; não duplique helpers dentro de módulos de perfil.
- Estilos compartilhados em `base.css`; estilos de layout interno em `painel.css`.
