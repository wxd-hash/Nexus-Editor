import type { EditorAPI, SlashCommandDef } from "@floatboat/nexus-core";
import { showPreview, hidePreview } from "./preview-plugin";
import { createStreamSession } from "./stream-handler";
import type { AIPluginOptions, AISlashCommandDef } from "./types";

const BUILTIN_COMMANDS: AISlashCommandDef[] = [
  {
    id: "ai-polish",
    title: "AI Polish",
    instruction: "Polish the wording",
    keywords: ["ai", "polish", "润色", "润饰"],
    description: "Improve wording and tone of the selected text",
  },
  {
    id: "ai-translate",
    title: "AI Translate to English",
    instruction: "Translate to English",
    keywords: ["ai", "translate", "翻译", "英文"],
    description: "Translate the selected text to English",
  },
  {
    id: "ai-expand",
    title: "AI Expand",
    instruction: "Expand into full text",
    keywords: ["ai", "expand", "扩写", "展开"],
    description: "Expand the selected outline into full paragraphs",
  },
  {
    id: "ai-summarize",
    title: "AI Summarize",
    instruction: "Summarize the key points",
    keywords: ["ai", "summarize", "总结", "摘要"],
    description: "Extract key points from the selected text",
  },
];

/**
 * Get the paragraph range at the cursor position.
 * A paragraph is bounded by blank lines (double newline) or doc start/end.
 */
function getParagraphRange(
  doc: string,
  cursor: number,
): { from: number; to: number; text: string } {
  const len = doc.length;
  let from = cursor;
  let to = cursor;

  // Search backward for blank line or doc start
  while (from > 0) {
    if (from >= 1 && doc[from - 1] === "\n") {
      const prev = from >= 2 ? doc[from - 2] : "";
      if (prev === "\n") break;
      // Check previous line is empty
      const lineStart = doc.lastIndexOf("\n", from - 2);
      const prevLine = doc.slice(lineStart + 1, from - 1).trim();
      if (prevLine === "") break;
    }
    from--;
  }

  // Search forward for blank line or doc end
  while (to < len) {
    if (doc[to] === "\n") {
      const nextLineStart = to + 1;
      const nextLineEnd = doc.indexOf("\n", nextLineStart);
      const nextLine =
        nextLineEnd === -1
          ? doc.slice(nextLineStart)
          : doc.slice(nextLineStart, nextLineEnd);
      if (nextLine.trim() === "") break;
    }
    to++;
  }

  return { from, to: Math.min(to + 1, len), text: doc.slice(from, to).trim() };
}

/** Convert an AISlashCommandDef to a SlashCommandDef with a run function. */
function toSlashCommandDef(
  cmd: AISlashCommandDef,
  options: AIPluginOptions,
): SlashCommandDef {
  return {
    id: cmd.id,
    title: cmd.title,
    keywords: cmd.keywords,
    description: cmd.description,
    run: (editor) => {
      void runAICommand(editor, cmd, options);
      return true;
    },
  };
}

/**
 * Execute an AI command on the editor.
 *
 * 1. Reads the selection (or falls back to the current paragraph).
 * 2. Shows a preview widget below the selection.
 * 3. Calls `options.onAIRun` with streaming params.
 * 4. On Accept → replaceRange, on Reject → hide, on Retry → re-run.
 */
async function runAICommand(
  editor: EditorAPI,
  cmd: AISlashCommandDef,
  options: AIPluginOptions,
): Promise<void> {
  const doc = editor.getDocument();
  const selection = editor.getSelection();

  let from: number;
  let to: number;
  let selectedText: string;

  if (selection.anchor !== selection.head) {
    // Has selection
    from = Math.min(selection.anchor, selection.head);
    to = Math.max(selection.anchor, selection.head);
    selectedText = doc.slice(from, to);
  } else {
    // No selection: take the current paragraph
    const para = getParagraphRange(doc, selection.anchor);
    from = para.from;
    to = para.to;
    selectedText = para.text;
  }

  if (!selectedText.trim()) return;

  const textBefore = doc.slice(Math.max(0, from - 500), from);
  const textAfter = doc.slice(to, Math.min(doc.length, to + 200));

  // Preview widget position: end of selection
  const previewPos = to;

  const controller = new AbortController();
  const stream = createStreamSession(controller.signal);

  // Show preview
  const widget = showPreview(previewPos, cmd.instruction);
  if (!widget) return;

  // Auto-cancel on user edit or cursor move
  const onEditorChange = () => {
    controller.abort();
  };
  editor.on("change", onEditorChange);
  editor.on("selectionChange", onEditorChange);

  // Escape key to cancel
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      controller.abort();
    }
  };
  document.addEventListener("keydown", onKeydown);

  // Cleanup helpers
  let settled = false;
  const cleanup = () => {
    if (settled) return;
    settled = true;
    document.removeEventListener("keydown", onKeydown);
    editor.off("change", onEditorChange);
    editor.off("selectionChange", onEditorChange);
  };

  const doAccept = (result: string) => {
    cleanup();
    hidePreview();
    editor.replaceRange(from, to, result, { anchor: from + result.length });
    editor.focus();
  };

  const doReject = () => {
    cleanup();
    hidePreview();
    editor.focus();
  };

  const doRetry = async () => {
    cleanup();
    hidePreview();
    // Re-run after a tick so the old widget is fully cleaned up
    await new Promise((r) => setTimeout(r, 0));
    await runAICommand(editor, cmd, options);
  };

  // Wire widget callbacks
  widget.onAccept(() => doAccept(stream.getAccumulated()));
  widget.onReject(doReject);
  widget.onRetry(() => void doRetry());

  // Stream chunks to the widget
  const onChunk = (delta: string) => {
    stream.onChunk(delta);
    widget.appendChunk(delta);
  };

  try {
    await options.onAIRun({
      instruction: cmd.instruction,
      selectedText,
      textBefore,
      textAfter,
      signal: controller.signal,
      onChunk,
    });

    if (stream.isAborted()) {
      doReject();
      return;
    }

    const result = stream.getAccumulated();
    if (!result.trim()) {
      widget.setState({ status: "error", message: "Empty result" });
      return;
    }

    widget.setState({ status: "done", result });
  } catch (err) {
    if (stream.isAborted()) {
      doReject();
      return;
    }
    widget.setState({
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Get the full command list (built-in + custom). */
export function getSlashCommands(
  options: AIPluginOptions,
): SlashCommandDef[] {
  const custom = (options.commands ?? []).map((cmd) =>
    toSlashCommandDef(cmd, options),
  );
  const builtin = BUILTIN_COMMANDS.map((cmd) =>
    toSlashCommandDef(cmd, options),
  );
  return [...builtin, ...custom];
}
