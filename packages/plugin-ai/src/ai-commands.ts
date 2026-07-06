import type { EditorAPI, SlashCommandDef } from "@floatboat/nexus-core";
import { showPreview, hidePreview } from "./preview-plugin";
import { createStreamSession } from "./stream-handler";
import type { AIPluginOptions, AISlashCommandDef } from "./types";

type AICmd = AISlashCommandDef & { hotkey?: string };

const BUILTIN_COMMANDS: AICmd[] = [
  {
    id: "ai-polish",
    title: "AI Polish",
    instruction: "Polish the wording",
    keywords: ["ai", "polish", "润色", "润饰"],
    description: "Improve wording and tone of the selected text",
    hotkey: "Ctrl-Alt-p",
  },
  {
    id: "ai-translate",
    title: "AI Translate to English",
    instruction: "Translate to English",
    keywords: ["ai", "translate", "翻译", "英文"],
    description: "Translate the selected text to English",
    hotkey: "Ctrl-Alt-t",
  },
  {
    id: "ai-expand",
    title: "AI Expand",
    instruction: "Expand into full text",
    keywords: ["ai", "expand", "扩写", "展开"],
    description: "Expand the selected outline into full paragraphs",
    hotkey: "Ctrl-Alt-e",
  },
  {
    id: "ai-summarize",
    title: "AI Summarize",
    instruction: "Summarize the key points",
    keywords: ["ai", "summarize", "总结", "摘要"],
    description: "Extract key points from the selected text",
    hotkey: "Ctrl-Alt-s",
  },
  {
    id: "ai-custom",
    title: "AI Custom...",
    instruction: "",
    keywords: ["ai", "custom", "ask", "自定义"],
    description: "Describe what you want the AI to do",
    hotkey: "Ctrl-Alt-k",
  },
];

function getParagraphRange(
  doc: string,
  cursor: number,
): { from: number; to: number; text: string } {
  const len = doc.length;
  let from = cursor;
  let to = cursor;

  while (from > 0) {
    if (from >= 1 && doc[from - 1] === "\n") {
      const lineStart = doc.lastIndexOf("\n", from - 2);
      const prevLine = doc.slice(lineStart + 1, from - 1).trim();
      if (prevLine === "") break;
    }
    from--;
  }

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

function getSelectionOrParagraph(editor: EditorAPI) {
  const doc = editor.getDocument();
  const sel = editor.getSelection();
  let from: number;
  let to: number;
  let text: string;

  if (sel.anchor !== sel.head) {
    from = Math.min(sel.anchor, sel.head);
    to = Math.max(sel.anchor, sel.head);
    text = doc.slice(from, to);
  } else {
    const para = getParagraphRange(doc, sel.anchor);
    from = para.from;
    to = para.to;
    text = para.text;
  }

  return { from, to, text };
}

async function runAICommand(
  editor: EditorAPI,
  cmd: AICmd,
  options: AIPluginOptions,
  /** For ai-custom: the user-supplied instruction from the prompt widget. */
  customInstruction?: string,
): Promise<void> {
  const doc = editor.getDocument();
  const { from, to, text: selectedText } = getSelectionOrParagraph(editor);
  if (!selectedText.trim()) return;

  const textBefore = doc.slice(Math.max(0, from - 500), from);
  const textAfter = doc.slice(to, Math.min(doc.length, to + 200));
  const previewPos = to;

  const instruction = customInstruction ?? cmd.instruction;

  // ai-custom: show prompt first, then re-enter with the user's instruction
  if (!customInstruction && !instruction) {
    const widget = showPreview(previewPos, "Custom", true);
    if (!widget) return;

    let lastDoc = editor.getDocument();
    const onEditorChange = () => {
      const currentDoc = editor.getDocument();
      if (currentDoc !== lastDoc) {
        lastDoc = currentDoc;
        hidePreview();
        editor.off("change", onEditorChange);
        editor.off("selectionChange", onEditorChange);
      }
    };
    editor.on("change", onEditorChange);
    editor.on("selectionChange", onEditorChange);

    widget.onReject(() => {
      hidePreview();
      editor.off("change", onEditorChange);
      editor.off("selectionChange", onEditorChange);
      editor.focus();
    });

    widget.onPromptSubmit(async (userInstruction) => {
      editor.off("change", onEditorChange);
      editor.off("selectionChange", onEditorChange);
      hidePreview();
      // Let CM6 process the hide effect before creating a new widget.
      await new Promise((r) => requestAnimationFrame(r));
      void runAICommand(editor, cmd, options, userInstruction);
    });

    return;
  }

  // Normal flow: show preview + stream AI output
  const controller = new AbortController();
  const stream = createStreamSession(controller.signal);

  const widget = showPreview(previewPos, instruction);
  if (!widget) return;

  let lastDoc = editor.getDocument();
  const onEditorChange = () => {
    const currentDoc = editor.getDocument();
    if (currentDoc !== lastDoc) {
      lastDoc = currentDoc;
      controller.abort();
    }
  };
  editor.on("change", onEditorChange);
  editor.on("selectionChange", onEditorChange);

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") controller.abort();
  };
  document.addEventListener("keydown", onKeydown);

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
    await new Promise((r) => setTimeout(r, 0));
    await runAICommand(editor, cmd, options, customInstruction);
  };

  widget.onAccept(() => doAccept(stream.getAccumulated()));
  widget.onReject(doReject);
  widget.onRetry(() => void doRetry());

  const onChunk = (delta: string) => {
    stream.onChunk(delta);
    widget.appendChunk(delta);
  };

  try {
    await options.onAIRun({
      instruction,
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

function toSlashCommandDef(
  cmd: AICmd,
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

export function getShortcuts(
  options: AIPluginOptions,
): Array<{ key: string; run: (editor: EditorAPI) => boolean }> {
  const all = [
    ...BUILTIN_COMMANDS,
    ...(options.commands ?? []),
  ];
  return all
    .filter((cmd) => cmd.hotkey)
    .map((cmd) => ({
      key: cmd.hotkey!,
      run: (editor: EditorAPI) => {
        void runAICommand(editor, cmd, options);
        return true;
      },
    }));
}
