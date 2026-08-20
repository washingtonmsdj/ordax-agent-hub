# Changelog

## v0.2.0-dev

Usability and workspace-safety update based on the first real multi-agent setup.

- Detects the Git repository root even when the user selects a subdirectory.
- Rejects folders that are not part of a Git repository instead of saving a broken path.
- Distinguishes primary checkouts from linked Git worktrees.
- Shows project, Git root, remote, branch, expected branch, HEAD, workspace type and local change count.
- Warns when two Agent Hub tabs point at the same Git workspace.
- Warns not to switch branches in a dirty shared checkout and recommends an isolated worktree.
- Automatically normalizes previously saved subdirectory paths to the real Git root.
- Adds versioned state migration (`version: 2`) and `agents.json.bak` recovery backup.
- Preserves existing Electron profile IDs, so ChatGPT sessions remain associated with the same tabs.
- Adds a read-only GitHub Releases update check from inside the application.
- Adds stable installer/portable artifact verification and SHA-256 checksum generation in CI.
- Validates that Release tags match the packaged application version.

### Still deliberate

- The application does not run `git commit`, `push`, `merge`, branch switches or worktree creation.
- Update checking opens the approved GitHub Release; unattended/self-installing updates are not enabled yet.
- No automated prompt sending, response scraping, credential extraction or automatic account rotation.

## v0.1.0-dev

Initial development release.

- Multiple ChatGPT web tabs with isolated persistent Electron sessions.
- Four default workstreams: Foundation, App Platform, Core Apps and QA / Tools.
- Per-agent mission, expected branch and local repository association.
- Read-only local Git status, branch, HEAD and origin inspection.
- Context-copy helper for transferring repository state into a ChatGPT conversation.
- Inactive-view suspension to reduce memory pressure.
- Windows development launcher and NSIS/portable build scripts.
- Minimal GitHub Actions CI for dependency install and JavaScript syntax validation.
