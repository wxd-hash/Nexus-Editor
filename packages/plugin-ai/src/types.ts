export interface AIRunParams {
  /** The AI instruction (e.g. "润色", "翻译成英文") */
  instruction: string;
  /** Selected text, or current paragraph if nothing selected */
  selectedText: string;
  /** Context before the cursor/selection (up to 500 chars) */
  textBefore: string;
  /** Context after the cursor/selection (up to 200 chars) */
  textAfter: string;
  /** Abort signal — aborted on Escape, cursor move, or new command */
  signal: AbortSignal;
  /** Call for each streaming chunk. The plugin accumulates and renders. */
  onChunk: (delta: string) => void;
}

export interface AISlashCommandDef {
  id: string;
  title: string;
  instruction: string;
  keywords?: string[];
  description?: string;
}

export interface AIPluginOptions {
  /** Called when user triggers an AI slash command. Implement this to
   * connect to your AI backend. Call `params.onChunk(delta)` for each
   * streaming token. */
  onAIRun: (params: AIRunParams) => Promise<void>;
  /** Additional custom commands appended to the 4 built-in ones */
  commands?: AISlashCommandDef[];
}

export type PreviewState =
  | { status: "loading" }
  | { status: "done"; result: string }
  | { status: "error"; message: string };
