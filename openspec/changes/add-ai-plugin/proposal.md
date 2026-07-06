# Change: Add AI Plugin

## Why

Nexus-Editor is positioned as "an ultra-lightweight inline interaction protocol designed for AI Agents", yet the codebase has zero AI-related features. This plugin provides the first AI integration point — slash-command-triggered text transformations with a preview-before-accept workflow.

## What Changes

- **New package** `@floatboat/nexus-plugin-ai` under `packages/plugin-ai/`
- 4 built-in AI slash commands: Polish, Translate to English, Expand, Summarize
- Streaming preview widget (block widget rendered below the selection)
- Accept / Reject / Retry interaction model — AI output never touches the document until the user explicitly accepts
- Extensible command registration via `commands` option

## Impact

- Affected specs: `ai-plugin` (new)
- Affected code: `packages/plugin-ai/` (new), no existing files modified
