import type { NexusPlugin } from "@floatboat/nexus-core";
import { getSlashCommands, getShortcuts } from "./ai-commands";
import { previewExtension } from "./preview-plugin";
import type { AIPluginOptions } from "./types";

export type {
  AIRunParams,
  AIPluginOptions,
  AISlashCommandDef,
  PreviewState,
} from "./types";

/**
 * Create an AI plugin for Nexus Editor.
 *
 * Two ways to invoke:
 * - **Selection + shortcut**: Select text and press a keyboard shortcut
 *   (Ctrl+Alt+P = Polish, Ctrl+Alt+T = Translate, etc.) — the selection
 *   is never destroyed.
 * - **Slash command**: Type `/ai` and pick a command — processes the
 *   paragraph at the cursor.
 */
export function createAIPlugin(options: AIPluginOptions): NexusPlugin {
  return {
    name: "plugin-ai",
    slashCommands: getSlashCommands(options),
    shortcuts: getShortcuts(options),
    cmExtensions: [previewExtension()],
  };
}
