# SuperDoc for VS Code

Open and edit `.docx` files directly in VS Code.

## Install

Search for **SuperDoc** in the VS Code Extensions panel, or:

```bash
code --install-extension superdoc-dev.superdoc-vscode-ext
```

Once installed, `.docx` files open with SuperDoc by default.

## Features

- **Real DOCX editing** — Formatting, tables, lists, headers — all preserved. No conversion to HTML or any intermediate format.
- **Pagination and rulers** — Documents render with page breaks and ruler guides, just like Word.
- **Auto-save** — Changes save automatically as you type.
- **Live reload** — When an AI agent or external process modifies your file, the document refreshes instantly.
- **Context menu** — Right-click any `.docx` in the Explorer and choose "Open with SuperDoc."

## How it works

SuperDoc renders documents directly from OOXML — the native format of `.docx` files. The extension bundles the full SuperDoc rendering and editing engine in a VS Code webview. No server calls. Your documents never leave your machine.

## Part of SuperDoc

This extension is part of [SuperDoc](https://github.com/superdoc-dev/superdoc) — open-source DOCX editing and tooling. Renders, edits, and automates .docx in the browser and on the server.

## License

AGPL-3.0 · [Enterprise license available](https://superdoc.dev)
