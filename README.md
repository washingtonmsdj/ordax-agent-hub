# OrdaX Agent Hub — v0.1.0-dev

Aplicativo desktop local para organizar várias sessões **manuais** do ChatGPT em abas isoladas e associar cada aba a uma missão, branch e clone Git local.

## Instalação no Windows

O caminho normal será baixar um executável pronto, sem precisar instalar Node.js:

1. abra **Releases** no GitHub;
2. baixe `OrdaX-Agent-Hub-Setup-<versão>-x64.exe`;
3. execute o instalador;
4. abra **OrdaX Agent Hub** pelo Menu Iniciar ou atalho da área de trabalho.

Também é gerada uma versão `OrdaX-Agent-Hub-Portable-<versão>-x64.exe`, que roda sem instalação.

Enquanto uma versão ainda estiver em validação por Pull Request, o workflow **Windows Build** gera os mesmos `.exe` como artifact de CI. Releases são a fonte de distribuição aprovada; artifacts de PR são builds de teste.

## Persistência durante atualizações

O programa instalado e os dados do usuário ficam separados. Contas/sessões web usam perfis persistentes do Electron e as configurações de agentes ficam no diretório `userData` do aplicativo. Atualizações normais devem substituir o binário sem apagar esses dados.

A atualização automática dentro do próprio aplicativo ainda não faz parte da `v0.1.0-dev`; GitHub Releases será a fonte usada por esse mecanismo quando ele for implementado.

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

## Requisitos para desenvolvimento local

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

## Criar .exe / instalador localmente

```powershell
npm install
npm run dist:win
```

Ou execute `build-windows.bat`.

Os arquivos gerados ficam em `dist/`.

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

## Build e Release pelo GitHub

- `.github/workflows/ci.yml`: valida sintaxe e metadata;
- `.github/workflows/windows-build.yml`: compila instalador + portable em Pull Requests e `main` e envia artifacts de CI;
- `.github/workflows/release-windows.yml`: publica os executáveis em GitHub Releases quando uma tag `v*` é publicada ou quando o workflow é disparado manualmente com uma tag.

O workflow de Release tem permissão de escrita apenas para publicar assets da própria Release. O workflow de build normal permanece somente leitura.

## Próximas versões sugeridas

- V0.2: backup/migração de dados + atualização pelo próprio aplicativo;
- V0.2: painel de PRs, diff viewer, testes e worktrees;
- V0.3: handoff entre agentes e dependências;
- V0.4: integração opcional com Codex local para testes/integração final;
- migração de `<webview>` para uma arquitetura de views Chromium controladas pelo processo principal caso seja necessário maior isolamento/controle.

## Desenvolvimento via Git

Este projeto foi separado do repositório do OrdaX OS. O fluxo recomendado é:

```text
branch -> commit -> push -> pull request -> CI -> revisão -> merge -> release
```

A versão inicial de desenvolvimento é `v0.1.0-dev`.
