# Contract templates

A demo of building **your own UI for Word content controls (SDT fields)** on top of SuperDoc. It turns off SuperDoc's built-in field chrome (`modules: { contentControls: { chrome: 'none' } }`) and renders its own: smart-field tokens as pills in the document, a "Smart tags" palette in the sidebar using the *same* pill look, and click-to-insert / locate / focus interactions — all on standard, Word-compatible SDTs that round-trip to `.docx`. A Mutual NDA opens with tagged smart fields and six versioned clauses; the app fills fields live, detects and replaces stale clauses, and exports a raw template or a clean final DOCX. Single-page, no backend, no framework.

The point: SuperDoc owns *how content is painted*, but with `chrome: 'none'` you own *the field's look and the surrounding UI*. You style the painted SDT wrapper, react to public events, position overlays with `getRect`, and mutate through `editor.doc.contentControls.*` — so fields in the editor can look exactly like your app. For the smallest copy-pasteable primitive, see the [tagged inline text example](../../examples/document-api/content-controls/tagged-inline-text).

## What this shows

The starting document is a Mutual NDA at `public/nda-template.docx` with thirteen content controls already in place: seven inline plain-text controls (smart fields) and six block rich-text controls (reusable clauses). Receiving party and Purpose each appear twice — once in the header sentence and once nested inside the Permitted Use clause. Each control carries a `w:tag` with a JSON payload. On boot, SuperDoc imports the DOCX, parses the SDTs, and the demo reads field values and clause versions straight from the parsed controls.

The flows, composed into one app:

1. **Custom field look + Smart-tags authoring.** Built-in chrome is off, so the demo styles the painted SDT wrapper itself: inline smart fields render as amber token pills via CSS on `.superdoc-structured-content-inline[data-sdt-tag*='smartField']`. The sidebar "Smart tags" palette uses the same `--tag-*` token style, so a palette chip and the field it inserts look identical. Clicking a chip captures the caret (`ui.selection.capture()`), inserts an inline SDT there (`editor.doc.create.contentControl({ at, content, tag })`), then focuses it (`ui.contentControls.focus`). Clicking a token in the document highlights its chip (`content-control:click`) — the two-way loop. Each field and clause also has Locate (`ui.contentControls.scrollIntoView`) and Focus (`ui.contentControls.focus`) to jump to it, and the active field gets a contextual chip overlay positioned with `getRect` + kept anchored with `ui.viewport.observe`.
2. **Smart fields (fill).** Seven inline plain-text content controls across five field keys share a `tag` shape (`{ kind: 'smartField', key: 'disclosingParty' }`) per occurrence. They were authored as Word "Plain Text Content Controls" (`ContentControls.Add(1, range)`), so SuperDoc resolves them as `controlType: 'text'`. Edit a value in the Fields tab; every occurrence of that field updates live via `selectByTag` + per-occurrence `text.setValue`. Receiving party and Purpose appear twice (header sentence and nested inside the Permitted Use clause), so a single edit fans across both locations.
3. **Versioned reusable clauses.** Six block rich-text content controls carry `{ kind: 'reusableSection', sectionId, version }` in their tags. They were authored as Word "Rich Text Content Controls" (`ContentControls.Add(0, range)`), which produces typeless sdtPr; SuperDoc resolves them as `controlType: 'richText'` per ECMA-376 §17.5.2.26. The app reads each live version from `contentControls.list`, compares against the clause library, and surfaces a Review CTA when they diverge. Review expands a card with the current clause text alongside the library clause text plus a Replace with library clause action that calls `replaceContent` + `patch`.
4. **Export.** `superdoc.export({ exportedName, isFinalDoc, triggerDownload })` has two buttons: **Export raw DOCX** uses `isFinalDoc: false` to preserve content controls and tags for future template/library updates; **Export clean DOCX** uses `isFinalDoc: true` to flatten controls so the filled values are in place.

Every mutation goes through `editor.doc.*`. The same operation set runs headless via the Node SDK and CLI.

## Run

```bash
pnpm install
pnpm dev
```

In the Fields tab, click a chip in the Smart tags palette to insert that field as a styled token at the cursor — it appears in the document with the same pill look as the chip. Click a token in the document and its chip highlights. Use Locate / Focus on a field or clause to jump to it (Focus also drops the cursor inside). Edit a value and it fans to every occurrence (header and nested locations). The seeded NDA ships with three clauses behind their latest versions (Confidentiality, Governing Law, Limitation of Liability); the Clauses tab shows a Review CTA on each, and expanding a card compares the in-document clause with the library version and replaces it in place. Export raw DOCX to keep the template controls, or clean DOCX for a final document with values in place.

## Related work

If you need a **ready-made React component for authoring templates** with content controls (`{{` trigger menu, linked field groups, owner/signer field types, DOCX export), see [`@superdoc-dev/template-builder`](https://docs.superdoc.dev/solutions/template-builder/introduction). This demo focuses on the *runtime* side: an app filling and updating already-tagged regions. Template Builder focuses on the *authoring* side.

## Honest limits

- All content controls in the fixture are `unlocked`. Locked controls (`sdtLocked`, `sdtContentLocked`) are not driven programmatically here.
- Smart field values are pushed through `text.setValue` (the typed API for plain-text controls). Clause bodies are pushed through `replaceContent` because rich-text controls don't have a typed setter.
- Clause bodies in the seeded fixture are single-paragraph plain prose; the rich-text wrapper supports formatting/lists/tables when authored that way, but the demo doesn't exercise those.

## See also

- [Document API > Content controls](https://docs.superdoc.dev/document-api/features/content-controls)
- [Document API > Reference > Content controls](https://docs.superdoc.dev/document-api/reference/content-controls/index)
- [Solutions > Template Builder](https://docs.superdoc.dev/solutions/template-builder/introduction)
- [Tagged inline text example](../../examples/document-api/content-controls/tagged-inline-text)
