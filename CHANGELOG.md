# Changelog

All notable changes to the TAI Discord Bot.

## [Unreleased]

### Added
- `list_linear_cycles` tool to query current and upcoming sprint cycles
- T-shirt size estimates (XS/S/M/L/XL) replacing Fibonacci points
- Section 9 (TAI Bot Linear Tools) in linear-usage-guide.md
- TAI Bot anti-patterns documentation
- Linear tools reference table in CLAUDE.md

### Changed
- Estimates now use T-shirt sizes: XS=1, S=2, M=3, L=5, XL=8
- Updated system prompt with cycle tool and estimate syntax

## [1.0.0] - 2026-01-22

### Added
- Initial release with Claude-powered Discord bot
- Linear integration: create, search, get, list, update issues
- Add comments to Linear issues
- List users, labels, projects from Linear
- Additive label updates (preserves existing labels)
- Role-based access control (free/premium/admin tiers)
- Rate limiting with token bucket algorithm
- Message context collection for conversational awareness
