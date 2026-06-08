import { describe, it, expect } from 'vitest';
import { TOOLBAR_FONTS, composeToolbarFontOptions } from './constants';

describe('TOOLBAR_FONTS (built-in font dropdown, the DocFonts toolbar catalog)', () => {
  const labels = () => TOOLBAR_FONTS.map((f) => f.label);

  it('lists the catalog in alphabetical order', () => {
    const sorted = [...labels()].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    expect(labels()).toEqual(sorted);
  });

  it('lists fonts beyond the metric-safe bundled defaults (bundled or not)', () => {
    const set = new Set(labels());
    // Metric-safe defaults plus qualified / category-fallback / unbundled candidates.
    for (const name of ['Arial', 'Calibri', 'Georgia', 'Aptos', 'Cambria', 'Calibri Light']) {
      expect(set.has(name)).toBe(true);
    }
  });

  it('previews a bundled clone as the clone, an unbundled candidate as the logical family', () => {
    const calibri = TOOLBAR_FONTS.find((f) => f.label === 'Calibri');
    expect(calibri.props.style.fontFamily).toBe('Carlito, sans-serif'); // bundled clone
    const georgia = TOOLBAR_FONTS.find((f) => f.label === 'Georgia');
    expect(georgia.props.style.fontFamily).toBe('Georgia, serif'); // Gelasio not bundled -> logical
  });

  it('builds a FontConfig: logical label + logical key', () => {
    const calibri = TOOLBAR_FONTS.find((f) => f.label === 'Calibri');
    expect(calibri).toMatchObject({
      label: 'Calibri', // applied to the selection + active-state match (Word-facing name)
      key: 'Calibri, sans-serif', // logical CSS stack (option identity)
      fontWeight: 400,
      props: { 'data-item': 'btn-fontFamily-option' },
    });
  });

  it('honors the FontConfig contract: label equals the first family in key', () => {
    for (const f of TOOLBAR_FONTS) {
      expect(f.key.split(',')[0].trim()).toBe(f.label);
    }
  });
});

describe('composeToolbarFontOptions (document fonts unioned with the bundled defaults)', () => {
  const doc = (logicalFamily, previewFamily) => ({
    logicalFamily,
    previewFamily: previewFamily ?? logicalFamily,
  });

  it('returns a consumer-provided fonts list unchanged (custom toolbars own their list)', () => {
    const custom = [{ label: 'My Font', key: 'My Font' }];
    expect(composeToolbarFontOptions([doc('Aptos')], custom)).toBe(custom);
  });

  it('returns undefined with no document fonts, so the caller keeps the bundled defaults', () => {
    expect(composeToolbarFontOptions([], undefined)).toBeUndefined();
    expect(composeToolbarFontOptions(undefined, undefined)).toBeUndefined();
  });

  it('combines the catalog and document fonts alphabetically, deduping one already in the catalog', () => {
    const options = composeToolbarFontOptions(
      [doc('Calibri', 'Carlito'), doc('Bangla MN'), doc('Aptos'), doc('Apple Chancery')],
      undefined,
    );
    // Calibri and Aptos are already in the catalog (deduped); Bangla MN and Apple Chancery are
    // document-only and get appended. Expectation derived from TOOLBAR_FONTS so it tracks the catalog.
    const catalogLabels = TOOLBAR_FONTS.map((f) => f.label);
    const expected = [...new Set([...catalogLabels, 'Bangla MN', 'Apple Chancery'])].sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' }),
    );
    expect(options.map((o) => o.label)).toEqual(expected);
    expect(options.filter((o) => o.label === 'Calibri')).toHaveLength(1);
  });

  it('maps a document-only font as a plain logical picker row, with no visible status text', () => {
    const options = composeToolbarFontOptions([doc('Apple Chancery')], undefined);
    const appleChancery = options.find((option) => option.label === 'Apple Chancery');
    expect(appleChancery).toMatchObject({
      label: 'Apple Chancery', // pure logical name (active-state match + the stored/exported value)
      key: 'Apple Chancery',
      props: { style: { fontFamily: 'Apple Chancery' }, 'data-item': 'btn-fontFamily-option' },
    });
  });

  it('keeps a document font as a plain name', () => {
    const options = composeToolbarFontOptions([doc('BrandSans')], undefined);
    const brandSans = options.find((option) => option.label === 'BrandSans');
    expect(brandSans.label).toBe('BrandSans');
  });
});
