# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-02-14

### Added
- Round-robin account selection for multi-account setups (least-recently-used first)
- Auto-retry with next account on any failure (rate-limit, auth, project ID errors)
- Rate-limit tracking with 5-minute cooldown per account
- Per-account quota breakdown in `image_quota` for multi-account configurations
- Graceful error summary listing each account and its failure reason
- `/antigravity-quota-img` command for opencode
- Unit tests for account selection logic (15 test cases)

### Changed
- Account state (`lastUsed`, `rateLimitedUntil`) persisted to `antigravity-accounts.json`
- Single-account users see no behavior change
- Fix command directory from `commands/` to `command/` (matching opencode convention)
- Command files now include YAML frontmatter with description

## [0.2.1] - 2026-01-28

### Fixed
- Clarify in tool description that output is always JPEG format
- Fix default filename extension from `.png` to `.jpg`
- Remove unnecessary PNG check since API always returns JPEG

## [0.2.0] - 2026-01-27

### Added
- Related plugins section in README linking to sibling plugins

### Changed
- Updated auth plugin link to correct repository (NoeFabris)

## [0.1.0] - 2026-01-26

### Added
- Initial release
- `generate_image` tool for generating images with Gemini 3 Pro Image model
- `image_quota` tool for checking remaining quota
- Support for aspect ratios: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
- Support for image sizes: 1K, 2K, 4K
- Automatic fallback between CloudCode API endpoints
