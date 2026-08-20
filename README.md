# OrdaX Agent Hub — v0.2.0-dev

Desktop workspace for keeping multiple manual ChatGPT sessions isolated while associating each session with a clearly identified Git workspace, expected branch and mission.

## Windows installation

Approved builds are intended to be distributed through GitHub Releases:

1. open **Releases**;
2. download `OrdaX-Agent-Hub-Setup-<version>-x64.exe`;
3. run the installer;
4. open **OrdaX Agent Hub** from the Start Menu or desktop shortcut.

A portable build named `OrdaX-Agent-Hub-Portable-<version>-x64.exe` is also generated. Pull Requests produce test artifacts through the **Windows Build** workflow; GitHub Releases remain the approved distribution source.

## What v0.2 changes

The Agent Hub now treats a Git *workspace* as the root of a clone or linked worktree, not as an arbitrary folder.

- selecting a normal subdirectory is automatically normalized to its Git root;
- selecting a folder outside Git is rejected;
- linked worktrees are detected and labeled `WORKTREE ISOLADO`;
- primary checkouts are labeled separately;
- the panel shows project, root, remote, branch, expected branch, HEAD and local changes;
- if two tabs resolve to the same Git root, the app warns that the workspace is shared;
- if an expected branch differs while the shared checkout is dirty, the app explicitly tells the user not to switch branches and to use a separate worktree.

The Git panel remains **read-only**. The application does not create branches, commit, push, merge, discard changes or create worktrees.

## Multi-agent layout

Recommended local structure:

```text
ordax-workspaces/
├── foundation/      -> codex/foundation-vnext
├── app-platform/    -> agent/app-platform
├── core-apps/       -> agent/core-apps
└── qa-tools/        -> agent/qa-tools
```

They may all belong to the same `novo-ordax-os` monorepo, while each working directory is a separate Git worktree. This isolates uncommitted changes without splitting the product into multiple repositories.

## Sessions and data persistence

Each agent keeps a stable Electron partition, for example:

```text
persist:ordax-agent-foundation
persist:ordax-agent-app-platform
persist:ordax-agent-core-apps
persist:ordax-agent-qa-tools
```

Version 0.2 keeps those IDs unchanged. Agent configuration is stored under Electron `userData`, now using schema `version: 2`. Before replacing state, the application keeps `agents.json.bak`; if the primary state becomes unreadable, it attempts recovery from the backup.

Updating the application binary normally does not remove these user-data directories or session partitions.

## Update experience

The app now has an **Atualizações** control. It checks non-draft releases from `washingtonmsdj/ordax-agent-hub` and, if a newer version exists, offers the approved GitHub Release page.

This is intentionally a safe first step: v0.2 does **not** silently replace the running executable. Fully automatic download/restart will only be enabled after release signing and rollback behavior are defined.

## ChatGPT behavior

- login is manual;
- accounts/sessions remain isolated by Electron partition;
- the app does not know or save Google/OpenAI passwords;
- it does not extract tokens/cookies;
- it does not automate prompt sending or response scraping;
- it does not rotate accounts automatically to bypass service limits.

## Memory management

Inactive webviews are unloaded after the configured interval (10 minutes by default). Their persistent session partition remains available when the tab is opened again.

## Development

Requirements: Node.js LTS, Git and Internet.

```powershell
npm install
npm start
```

Build Windows installer + portable:

```powershell
npm install
npm run dist:win
```

## CI / Release

- `.github/workflows/ci.yml` validates JavaScript and package metadata;
- `.github/workflows/windows-build.yml` builds and verifies Setup + Portable on Windows and emits `SHA256SUMS.txt`;
- `.github/workflows/release-windows.yml` requires the Git tag to match the `package.json` version before publishing a Release.

The application is still unsigned during development, so Windows SmartScreen may show an unknown-publisher warning.
