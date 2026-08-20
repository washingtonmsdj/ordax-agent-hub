# Changelog

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

### Deliberate limitations

- No automated prompt sending or response scraping.
- No credential, token or cookie extraction.
- No Git commit/push/merge actions.
- No automatic account rotation to bypass service limits.
- No automatic application updater yet.
