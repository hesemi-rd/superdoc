import { describe, it, expect } from 'vitest';
import { getToolbarFontCatalog } from '@superdoc/font-system';
import { DEFAULT_FONT_FAMILY_OPTIONS } from './constants';

describe('DEFAULT_FONT_FAMILY_OPTIONS (headless default font options, the DocFonts toolbar catalog)', () => {
  it('lists the catalog as logical name + logical stack, alphabetically', () => {
    // Derived from the shared catalog so the assertion tracks DocFonts growth rather than pinning a list.
    const expected = getToolbarFontCatalog().map((entry) => ({
      label: entry.logicalFamily,
      value: `${entry.logicalFamily}, ${entry.generic}`,
    }));
    expect(DEFAULT_FONT_FAMILY_OPTIONS).toEqual(expected);
  });

  it('lists fonts beyond the metric-safe bundled defaults (bundled or not)', () => {
    const labels = new Set(DEFAULT_FONT_FAMILY_OPTIONS.map((o) => o.label));
    for (const name of ['Arial', 'Calibri', 'Georgia', 'Aptos', 'Cambria']) {
      expect(labels.has(name)).toBe(true);
    }
  });

  it('stores the logical name, never a physical clone, in the applied value', () => {
    const calibri = DEFAULT_FONT_FAMILY_OPTIONS.find((o) => o.label === 'Calibri');
    expect(calibri?.value).toBe('Calibri, sans-serif'); // logical, not "Carlito, ..."
  });
});
