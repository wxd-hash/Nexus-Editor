import { StateField, StateEffect } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { PreviewWidget, injectPreviewStyles } from "./preview-widget";

// --- module-level refs ---
let viewRef: EditorView | null = null;

// --- StateEffect ---
const showPreviewEffect = StateEffect.define<{
  pos: number;
  widget: PreviewWidget;
}>();

const hidePreviewEffect = StateEffect.define();

// --- StateField ---
const previewField = StateField.define<{
  pos: number;
  widget: PreviewWidget;
} | null>({
  create() {
    return null;
  },

  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(hidePreviewEffect)) {
        if (value) value.widget.destroy();
        return null;
      }
      if (e.is(showPreviewEffect)) {
        if (value) value.widget.destroy();
        return { pos: e.value.pos, widget: e.value.widget };
      }
    }
    return value;
  },

  provide: (field) =>
    EditorView.decorations.from(field, (value) => {
      if (!value) return Decoration.none;
      return Decoration.set([
        Decoration.widget({
          widget: value.widget,
          block: true,
          side: 1,
        }).range(value.pos),
      ]);
    }),
});

// --- ViewPlugin ---
const previewViewPlugin = ViewPlugin.define(
  () => ({
    update(update: ViewUpdate) {
      viewRef = update.view;
    },
  }),
);

/** Combine both extensions for the plugin. */
export function previewExtension() {
  injectPreviewStyles();
  return [previewField, previewViewPlugin];
}

/**
 * Show a preview widget at `pos` (end of selection) and return the
 * widget instance so callers can set callbacks and stream text.
 * Returns null if the editor view is not available.
 */
export function showPreview(
  pos: number,
  instruction: string,
  promptMode = false,
): PreviewWidget | null {
  if (!viewRef) return null;
  const widget = new PreviewWidget(instruction, promptMode);
  viewRef.dispatch({ effects: showPreviewEffect.of({ pos, widget }) });
  return widget;
}

/** Remove the current preview widget (no-op if none). */
export function hidePreview(): void {
  if (!viewRef) return;
  viewRef.dispatch({ effects: hidePreviewEffect.of(null!) });
}
