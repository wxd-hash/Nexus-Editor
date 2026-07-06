import { WidgetType } from "@codemirror/view";
import type { PreviewState } from "./types";

/**
 * Block widget that renders the AI preview card below the selection.
 *
 * Two modes:
 * - **Direct**: Streaming output immediately (for built-in commands).
 * - **Prompt**: Shows a textarea first for custom instructions, then
 *   transitions to streaming after the user submits.
 */
export class PreviewWidget extends WidgetType {
  private contentEl: HTMLElement | null = null;
  private actionsEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private promptEl: HTMLElement | null = null;
  private state: PreviewState = { status: "loading" };

  private _onAccept: (() => void) | null = null;
  private _onReject: (() => void) | null = null;
  private _onRetry: (() => void) | null = null;
  private _onPromptSubmit: ((instruction: string) => void) | null = null;

  constructor(private instruction: string, private promptMode = false) {
    super();
  }

  eq(_other: WidgetType): boolean {
    return true;
  }

  toDOM(): HTMLElement {
    const card = document.createElement("div");
    card.className = "nexus-ai-preview";

    // Header
    const header = document.createElement("div");
    header.className = "nexus-ai-preview-header";

    this.statusEl = document.createElement("span");
    this.statusEl.className = "nexus-ai-preview-status";
    this.statusEl.textContent = "\u{1F916}";

    this.titleEl = document.createElement("span");
    this.titleEl.className = "nexus-ai-preview-title";
    this.titleEl.textContent = `AI ${this.instruction}`;

    header.append(this.statusEl, this.titleEl);

    // Content
    this.contentEl = document.createElement("div");
    this.contentEl.className = "nexus-ai-preview-content";

    if (this.promptMode) {
      this.buildPromptInput();
    } else {
      const loader = document.createElement("span");
      loader.className = "nexus-ai-preview-loader";
      loader.textContent = "...";
      this.contentEl.appendChild(loader);
    }

    // Actions (hidden until done/error)
    this.actionsEl = document.createElement("div");
    this.actionsEl.className = "nexus-ai-preview-actions";
    this.actionsEl.style.display = "none";

    const acceptBtn = this.makeBtn("Accept", "primary");
    const rejectBtn = this.makeBtn("Reject", "secondary");
    const retryBtn = this.makeBtn("Retry", "secondary");

    acceptBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._onAccept?.();
    });
    rejectBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._onReject?.();
    });
    retryBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._onRetry?.();
    });

    this.actionsEl.append(acceptBtn, rejectBtn, retryBtn);
    card.append(header, this.contentEl, this.actionsEl);
    return card;
  }

  toDOMView() {
    return this.toDOM();
  }

  // ---- prompt mode ----

  private buildPromptInput(): void {
    if (!this.contentEl) return;

    this.promptEl = document.createElement("div");
    this.promptEl.className = "nexus-ai-prompt";

    const textarea = document.createElement("textarea");
    textarea.className = "nexus-ai-prompt-input";
    textarea.placeholder = "Describe what you want the AI to do...";
    textarea.rows = 2;
    textarea.style.cssText =
      "width:100%;box-sizing:border-box;border:1px solid var(--nexus-border-subtle,#d0d7de);" +
      "border-radius:6px;padding:8px;font:inherit;resize:vertical;min-height:44px;" +
      "background:var(--nexus-bg,#fff);color:var(--nexus-text,#1f2328);";

    const sendBtn = this.makeBtn("Send", "primary");
    sendBtn.style.marginTop = "6px";

    const submit = () => {
      const val = textarea.value.trim();
      if (!val) return;
      textarea.disabled = true;
      sendBtn.disabled = true;
      this._onPromptSubmit?.(val);
    };

    sendBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      submit();
    });
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    });

    this.promptEl.append(textarea, sendBtn);
    this.contentEl.appendChild(this.promptEl);

    // Auto-focus the textarea after it's in the DOM
    requestAnimationFrame(() => textarea.focus());
  }

  onPromptSubmit(cb: (instruction: string) => void): void {
    this._onPromptSubmit = cb;
  }

  // ---- streaming ----

  appendChunk(delta: string): void {
    if (!this.contentEl) return;
    const loader = this.contentEl.querySelector(".nexus-ai-preview-loader");
    if (loader) loader.remove();
    this.contentEl.appendChild(document.createTextNode(delta));
  }

  // ---- state ----

  setState(state: PreviewState): void {
    this.state = state;
    if (!this.statusEl || !this.actionsEl || !this.contentEl) return;

    if (state.status === "done") {
      this.statusEl.textContent = "✅";
      this.actionsEl.style.display = "flex";
    } else if (state.status === "error") {
      this.statusEl.textContent = "⚠️";
      const loader = this.contentEl.querySelector(".nexus-ai-preview-loader");
      if (loader) loader.remove();
      const existingErr = this.contentEl.querySelector(".nexus-ai-preview-error");
      if (!existingErr) {
        const errEl = document.createElement("div");
        errEl.className = "nexus-ai-preview-error";
        errEl.textContent = state.message;
        errEl.style.color = "var(--nexus-hl-deletion, #c33)";
        this.contentEl.appendChild(errEl);
      }
      const retryBtn = this.actionsEl.querySelector(
        "[data-action=retry]"
      ) as HTMLElement | null;
      if (retryBtn) {
        this.actionsEl.style.display = "flex";
        for (const child of Array.from(this.actionsEl.children)) {
          (child as HTMLElement).style.display =
            child === retryBtn ? "" : "none";
        }
      }
    }
  }

  onAccept(cb: () => void): void { this._onAccept = cb; }
  onReject(cb: () => void): void { this._onReject = cb; }
  onRetry(cb: () => void): void { this._onRetry = cb; }

  destroy(): void {
    this.contentEl = null;
    this.actionsEl = null;
    this.statusEl = null;
    this.promptEl = null;
  }

  private makeBtn(
    label: string,
    kind: "primary" | "secondary"
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.setAttribute("data-action", label.toLowerCase());
    btn.className =
      kind === "primary"
        ? "nexus-ai-preview-btn nexus-ai-preview-btn--primary"
        : "nexus-ai-preview-btn nexus-ai-preview-btn--secondary";
    return btn;
  }
}

// ---- Styles ----

let stylesInjected = false;
export function injectPreviewStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;

  const css = `
.nexus-ai-preview {
  margin: 8px 0;
  border: 1px solid var(--nexus-border-subtle, #d0d7de);
  border-radius: 8px;
  background: var(--nexus-bg-subtle, #f6f8fa);
  font-family: var(--nexus-font-ui, system-ui, sans-serif);
  font-size: 13px;
  overflow: hidden;
  user-select: none;
}
.nexus-ai-preview-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--nexus-border-subtle, #d0d7de);
  background: var(--nexus-bg, #fff);
}
.nexus-ai-preview-status { font-size: 14px; }
.nexus-ai-preview-title {
  font-weight: 600;
  color: var(--nexus-text, #1f2328);
}
.nexus-ai-preview-content {
  padding: 10px 12px;
  color: var(--nexus-text, #1f2328);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 36px;
}
.nexus-ai-preview-loader {
  color: var(--nexus-text-muted, #656d76);
  animation: nexus-ai-blink 1s step-end infinite;
}
@keyframes nexus-ai-blink { 50% { opacity: 0; } }
.nexus-ai-preview-actions {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid var(--nexus-border-subtle, #d0d7de);
  background: var(--nexus-bg, #fff);
}
.nexus-ai-preview-btn {
  padding: 4px 14px;
  border-radius: 6px;
  border: 1px solid var(--nexus-border-subtle, #d0d7de);
  background: var(--nexus-bg, #fff);
  color: var(--nexus-text, #1f2328);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background .15s;
}
.nexus-ai-preview-btn:hover { background: var(--nexus-bg-hover, #eaeef2); }
.nexus-ai-preview-btn--primary {
  background: var(--nexus-accent, #7c6cf4);
  color: #fff;
  border-color: var(--nexus-accent, #7c6cf4);
}
.nexus-ai-preview-btn--primary:hover { opacity: 0.88; }
`;
  const style = document.createElement("style");
  style.setAttribute("data-nexus-ai-preview-styles", "true");
  style.textContent = css;
  document.head.appendChild(style);
}
