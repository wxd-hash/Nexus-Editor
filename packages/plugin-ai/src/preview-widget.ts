import { WidgetType } from "@codemirror/view";
import type { PreviewState } from "./types";

/**
 * Block widget that renders the AI preview card below the selection.
 * Streaming text is appended to the content area via `appendChunk()`.
 * When the stream ends, call `setState("done", result)` to reveal
 * the Accept / Reject / Retry buttons.
 */
export class PreviewWidget extends WidgetType {
  private contentEl: HTMLElement | null = null;
  private actionsEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private state: PreviewState = { status: "loading" };

  private _onAccept: (() => void) | null = null;
  private _onReject: (() => void) | null = null;
  private _onRetry: (() => void) | null = null;

  constructor(private instruction: string) {
    super();
  }

  eq(): boolean {
    // Never replace — the widget manages its own DOM updates
    return true;
  }

  toDOM(): HTMLElement {
    const card = document.createElement("div");
    card.className = "nexus-ai-preview";
    card.setAttribute("data-nexus-ai-preview", "true");

    // Header
    const header = document.createElement("div");
    header.className = "nexus-ai-preview-header";

    this.statusEl = document.createElement("span");
    this.statusEl.className = "nexus-ai-preview-status";
    this.statusEl.textContent = "\u{1F916}";

    const title = document.createElement("span");
    title.className = "nexus-ai-preview-title";
    title.textContent = `AI ${this.instruction}`;

    header.append(this.statusEl, title);

    // Content
    this.contentEl = document.createElement("div");
    this.contentEl.className = "nexus-ai-preview-content";

    // Loading dots
    const loader = document.createElement("span");
    loader.className = "nexus-ai-preview-loader";
    loader.textContent = "...";
    this.contentEl.appendChild(loader);

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

  /** Append streaming text to the content area. */
  appendChunk(delta: string): void {
    if (!this.contentEl) return;
    // Remove loader on first chunk
    const loader = this.contentEl.querySelector(".nexus-ai-preview-loader");
    if (loader) loader.remove();

    // Append as text node to preserve formatting
    this.contentEl.appendChild(document.createTextNode(delta));
  }

  /** Transition to done or error state. */
  setState(state: PreviewState): void {
    this.state = state;
    if (!this.statusEl || !this.actionsEl) return;

    if (state.status === "done") {
      this.statusEl.textContent = "✅";
      this.actionsEl.style.display = "flex";
    } else if (state.status === "error") {
      this.statusEl.textContent = "⚠️";
      // Show error + retry-only
      const retryBtn = this.actionsEl.querySelector(
        "[data-action=retry]"
      ) as HTMLElement | null;
      if (retryBtn) {
        this.actionsEl.style.display = "flex";
        // Hide accept/reject, show only retry
        for (const child of this.actionsEl.children) {
          (child as HTMLElement).style.display =
            child === retryBtn ? "" : "none";
        }
      }
    }
  }

  onAccept(cb: () => void): void {
    this._onAccept = cb;
  }
  onReject(cb: () => void): void {
    this._onReject = cb;
  }
  onRetry(cb: () => void): void {
    this._onRetry = cb;
  }

  destroy(): void {
    this.contentEl = null;
    this.actionsEl = null;
    this.statusEl = null;
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

/** One-time style injection for the preview card. */
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
.nexus-ai-preview-status {
  font-size: 14px;
}
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
@keyframes nexus-ai-blink {
  50% { opacity: 0; }
}
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
.nexus-ai-preview-btn:hover {
  background: var(--nexus-bg-hover, #eaeef2);
}
.nexus-ai-preview-btn--primary {
  background: var(--nexus-accent, #7c6cf4);
  color: #fff;
  border-color: var(--nexus-accent, #7c6cf4);
}
.nexus-ai-preview-btn--primary:hover {
  opacity: 0.88;
}
`;
  const style = document.createElement("style");
  style.setAttribute("data-nexus-ai-preview-styles", "true");
  style.textContent = css;
  document.head.appendChild(style);
}
