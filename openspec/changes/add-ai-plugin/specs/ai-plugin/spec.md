## ADDED Requirements

### Requirement: AI Slash Commands

The system SHALL provide a plugin (`@floatboat/nexus-plugin-ai`) that registers AI-powered slash commands for text transformation. Each command SHALL read the selected text (or current paragraph when nothing is selected), call a host-provided `onAIRun` callback with streaming support, and display the AI output in a preview widget before the user accepts or rejects it.

#### Scenario: AI command replaces selected text on Accept

- **WHEN** the user selects text, triggers an AI slash command (e.g. "Polish"), and clicks Accept on the preview widget
- **THEN** the original selection SHALL be replaced with the AI-generated result in a single undoable transaction

#### Scenario: AI command reverts to original text on Reject

- **WHEN** the user triggers an AI slash command and clicks Reject on the preview widget
- **THEN** the preview widget SHALL be removed and the document SHALL remain unchanged

#### Scenario: Preview widget displays AI output as it streams

- **WHEN** an AI slash command is triggered and the `onAIRun` callback emits chunks via `onChunk`
- **THEN** each chunk SHALL be appended to the preview widget content area in real time

#### Scenario: Escape key cancels AI generation

- **WHEN** the user presses Escape during AI generation
- **THEN** the AI request SHALL be aborted, the preview widget SHALL be removed, and the document SHALL remain unchanged

#### Scenario: User edit cancels AI generation

- **WHEN** the user moves the cursor or types while AI generation is in progress
- **THEN** the AI request SHALL be aborted and the preview widget SHALL be removed

#### Scenario: Accept creates a single undo entry

- **WHEN** the user accepts the AI result by clicking Accept
- **THEN** the replacement SHALL be a single transaction so that Ctrl+Z reverts the entire AI output in one step

#### Scenario: No selection falls back to current paragraph

- **WHEN** the user triggers an AI slash command with no text selected
- **THEN** the system SHALL automatically use the paragraph at the cursor position as the input text

#### Scenario: Custom commands extend the built-in set

- **WHEN** the user configures `createAIPlugin` with additional `commands`
- **THEN** those commands SHALL be appended after the 4 built-in commands in the slash menu

### Requirement: Streaming Text Accumulator

The system SHALL provide a streaming text accumulator that collects chunks from the AI callback and respects an `AbortSignal` for cancellation.

#### Scenario: Accumulator collects chunks

- **WHEN** `onChunk` is called multiple times with text fragments
- **THEN** `getAccumulated()` SHALL return the concatenated text in order

#### Scenario: Accumulator stops after abort

- **WHEN** the `AbortSignal` is triggered
- **THEN** subsequent `onChunk` calls SHALL be ignored and `isAborted()` SHALL return true
