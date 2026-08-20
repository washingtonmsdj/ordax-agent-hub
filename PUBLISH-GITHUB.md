# Publicação e fluxo Git

Repositório canônico: `washingtonmsdj/ordax-agent-hub`

Estado inicial publicado: `v0.1.0-dev`.

## Fluxo recomendado

```text
branch -> commit -> push -> pull request -> CI -> revisão -> merge
```

O `main` deve representar a linha integrada do Agent Hub. Novas funcionalidades devem preferencialmente entrar por branches e PRs separados.

## Releases

A versão de desenvolvimento atual é `0.1.0-dev`. Uma tag/release GitHub formal pode ser criada quando decidirmos congelar um build distribuível.

A atualização automática do aplicativo ainda não faz parte da v0.1.0-dev; ela será adicionada somente depois que a base estiver estável e o fluxo de releases Windows estiver validado.
