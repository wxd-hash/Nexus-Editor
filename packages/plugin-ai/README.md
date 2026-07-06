# @floatboat/nexus-plugin-ai

AI slash commands for Nexus Editor. Trigger AI-powered text transformations (polish, translate, expand, summarize) on selected text, preview the result, and accept or reject.

## Install

```bash
npm install @floatboat/nexus-plugin-ai
```

## Usage

```ts
import { createEditor } from "@floatboat/nexus-core";
import { createAIPlugin } from "@floatboat/nexus-plugin-ai";

const aiPlugin = createAIPlugin({
  onAIRun: async (params) => {
    // Call your AI API here.
    // Call params.onChunk(delta) for each streaming chunk.
  },
});

const editor = createEditor({
  container: document.getElementById("editor")!,
  plugins: [aiPlugin],
});
```

## Built-in Commands

| Command | Id | Description |
|---------|----|-------------|
| AI Polish | `ai-polish` | Improve wording and tone of selected text |
| AI Translate to English | `ai-translate` | Translate selected text to English |
| AI Expand | `ai-expand` | Expand selected outline into full text |
| AI Summarize | `ai-summarize` | Extract key points from selected text |

## Custom Commands

```ts
createAIPlugin({
  onAIRun: async ({ instruction, selectedText, signal, onChunk }) => {
    // ...
  },
  commands: [
    {
      id: "ai-proofread",
      title: "AI Proofread",
      instruction: "校对语法错误",
      keywords: ["proofread", "校对"],
    },
  ],
});
```

## API

### `createAIPlugin(options)`

Returns a `NexusPlugin`.

### `AIPluginOptions`

| Property | Type | Description |
|----------|------|-------------|
| `onAIRun` | `(params: AIRunParams) => Promise<void>` | Called when user triggers an AI command |
| `commands` | `AISlashCommandDef[]` | Additional custom commands |

### `AIRunParams`

| Property | Type | Description |
|----------|------|-------------|
| `instruction` | `string` | The AI instruction (e.g. "润色") |
| `selectedText` | `string` | Selected text or current paragraph |
| `textBefore` | `string` | Context before selection (500 chars) |
| `textAfter` | `string` | Context after selection (200 chars) |
| `signal` | `AbortSignal` | Abort signal (Esc or cursor move) |
| `onChunk` | `(delta: string) => void` | Call for each streaming chunk |
