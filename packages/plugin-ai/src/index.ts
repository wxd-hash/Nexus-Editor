import type { NexusPlugin } from "@floatboat/nexus-core";
import { getSlashCommands } from "./ai-commands";
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
 * Provides slash commands (`/ai polish`, `/ai translate`, etc.) that:
 * 1. Read the selected text (or current paragraph).
 * 2. Call `options.onAIRun` for AI processing with streaming support.
 * 3. Show a preview card below the selection.
 * 4. Let the user Accept, Reject, or Retry the AI output.
 */
export function createAIPlugin(options: AIPluginOptions): NexusPlugin {
  const slashCommands = getSlashCommands(options);

  return {
    name: "plugin-ai",
    slashCommands,
    cmExtensions: [previewExtension()],
  };
}
