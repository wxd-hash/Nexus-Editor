## 1. Implementation

- [x] 1.1 Create `packages/plugin-ai/` with package.json, tsconfig.json, README.md
- [x] 1.2 Define types: `AIRunParams`, `AIPluginOptions`, `AISlashCommandDef`, `PreviewState`
- [x] 1.3 Implement `PreviewWidget` (block widget with header, content, actions)
- [x] 1.4 Implement `preview-plugin` (StateField + ViewPlugin for widget management)
- [x] 1.5 Implement `stream-handler` (pure-data stream accumulator)
- [x] 1.6 Define 4 built-in AI commands and `getSlashCommands`
- [x] 1.7 Implement `runAICommand` — selection/paragraph detection, preview lifecycle, accept/reject/retry
- [x] 1.8 Implement `createAIPlugin` entry point
- [x] 1.9 Write unit tests (18 tests covering plugin creation, widget DOM, stream handler, editor integration)
- [x] 1.10 Build and verify `pnpm test` passes (533 tests, 0 failures)
