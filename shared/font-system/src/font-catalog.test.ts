import { describe, it, expect } from 'vitest';
import { getToolbarFontCatalog, fontCatalogStack, fontCatalogPreviewStack } from './font-catalog';
import { FONT_OFFERINGS } from './font-offerings';
import { resolveFontFamily } from './resolver';

const alphabetically = (names: readonly string[]) =>
  [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

const byName = (name: string) => getToolbarFontCatalog().find((entry) => entry.logicalFamily === name);

describe('font catalog (toolbar-selectable fonts)', () => {
  it('lists every toolbar-selectable offering, deduped and alphabetical', () => {
    const expected = alphabetically([...new Set(FONT_OFFERINGS.map((o) => o.logicalFamily))]);
    expect(getToolbarFontCatalog().map((entry) => entry.logicalFamily)).toEqual(expected);
  });

  it('includes fonts the metric-safe DEFAULTS deliberately exclude', () => {
    const names = new Set(getToolbarFontCatalog().map((entry) => entry.logicalFamily));
    // Cambria (qualified), Calibri Light (category fallback), Georgia (clone not bundled), Aptos (no clone).
    for (const name of ['Cambria', 'Calibri Light', 'Georgia', 'Aptos']) {
      expect(names.has(name)).toBe(true);
    }
  });

  it('includes preserve-only families as logical choices without claiming a substitute', () => {
    const names = new Set(getToolbarFontCatalog().map((entry) => entry.logicalFamily));
    for (const offering of FONT_OFFERINGS.filter((o) => o.offering === 'preserve_only')) {
      expect(names.has(offering.logicalFamily)).toBe(true);
    }
  });

  it('previews a bundled clone as the clone, an unbundled candidate as the logical family', () => {
    expect(byName('Calibri')?.previewFamily).toBe('Carlito'); // bundled clone
    expect(byName('Cambria')?.previewFamily).toBe('Caladea'); // bundled clone (qualified)
    expect(byName('Georgia')?.previewFamily).toBe('Georgia'); // Gelasio is not bundled -> logical
    expect(byName('Aptos')?.previewFamily).toBe('Aptos'); // no clone -> logical
  });

  it('keeps label / value logical: the stack stores the logical name, only the preview uses the clone', () => {
    const calibri = byName('Calibri')!;
    expect(calibri.logicalFamily).toBe('Calibri');
    expect(fontCatalogStack(calibri)).toBe('Calibri, sans-serif'); // logical: stored / applied / exported
    expect(fontCatalogPreviewStack(calibri)).toBe('Carlito, sans-serif'); // physical: dropdown preview only
  });

  it('does NOT broaden the resolver: an unbundled catalog font still resolves as-requested', () => {
    expect(resolveFontFamily('Georgia').reason).toBe('as_requested');
    expect(resolveFontFamily('Aptos').reason).toBe('as_requested');
    expect(resolveFontFamily('Cambria Math').reason).toBe('as_requested');
  });
});
