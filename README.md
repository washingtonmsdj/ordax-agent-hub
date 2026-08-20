# OrdaX Agent Hub — v0.1.0-dev

Aplicativo desktop local para organizar várias sessões **manuais** do ChatGPT em abas isoladas e associar cada aba a uma missão, branch e clone Git local.

## O que esta versão faz

- uma aba por agente/conta;
- cada aba usa um `partition` persistente do Electron, separando cookies e sessão;
- login é feito manualmente pelo usuário dentro de cada aba;
- quatro agentes iniciais: Foundation, App Platform, Core Apps e QA / Tools;
- permite adicionar/editar/excluir abas;
- associa cada agente a um clone Git local;
- lê branch, HEAD e `git status` sem alterar o repositório;
- avisa se a branch atual não é a branch esperada pelo agente;
- botão **Copiar contexto** monta um pequeno cabeçalho para colar na conversa;
- mantém a última URL/conversa visitada por aba;
- descarrega WebViews inativas após 10 minutos para reduzir uso de memória, preservando cookies/sessão persistente;
- gera instalador NSIS e versão portátil para Windows via `electron-builder`.

## O que esta versão NÃO faz

- não conhece nem salva sua senha do Google/OpenAI;
- não extrai tokens/cookies;
- não automatiza envio de prompts nem leitura de respostas;
- não alterna automaticamente contas para contornar limites de uso;
- não executa commits/push/merge;
- não modifica o repositório Git;
- não dá ao ChatGPT web acesso direto ao filesystem local.

O painel Git é uma ferramenta local separada da sessão web.

## Requisitos no Windows

1. Node.js LTS instalado.
2. Git instalado e disponível no `PATH`.
3. Internet.

## Rodar em modo desenvolvimento

Abra `PowerShell` nesta pasta:

```powershell
npm install
npm start
```

Ou execute `run-windows.bat`.

## Criar .exe / instalador

```powershell
npm install
npm run dist:win
```

Ou execute `build-windows.bat`.

Os arquivos gerados ficam normalmente em `dist/`.

## Primeiro uso

1. Abra o app.
2. Clique na aba `Foundation`.
3. Faça login na Conta GPT 1 normalmente dentro da aba.
4. Abra `App Platform` e faça login com a Conta GPT 2.
5. Repita nas demais abas.
6. Em cada aba, clique em `...` ao lado de **Repositório local** e selecione o clone/worktree correspondente.
7. Defina a branch esperada e missão pelo botão de edição.

Cada aba recebe um perfil persistente diferente, por exemplo:

```text
persist:ordax-agent-foundation
persist:ordax-agent-app-platform
persist:ordax-agent-core-apps
persist:ordax-agent-qa-tools
```

## Observação sobre login

O ChatGPT e provedores de identidade podem alterar políticas de login em navegadores embutidos. Login por Google/OAuth pode eventualmente exigir abrir um navegador externo ou uma implementação futura baseada em Chromium/CEF com tratamento específico. O MVP não tenta contornar restrições do provedor.

## Segurança

O renderer principal usa `contextIsolation`, `sandbox` e uma API IPC mínima. Os WebViews do ChatGPT têm Node desativado. Mesmo assim, trate esta versão como MVP de desenvolvimento, não como um navegador de uso geral.

## Próximas versões sugeridas

- V0.2: painel de PRs, diff viewer, testes e worktrees;
- V0.3: handoff entre agentes e dependências;
- V0.4: integração opcional com Codex local para testes/integração final;
- migração de `<webview>` para uma arquitetura de views Chromium controladas pelo processo principal caso seja necessário maior isolamento/controle.


## Desenvolvimento via Git

Este projeto foi separado do repositório do OrdaX OS. O fluxo recomendado é:

```text
branch -> commit -> push -> pull request -> CI -> revisão -> merge
```

A versão inicial de desenvolvimento é `v0.1.0-dev`. Atualização automática do aplicativo não faz parte desta versão; ela será adicionada somente depois que a base do Agent Hub estiver estável.
