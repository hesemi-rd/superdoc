/**
 * Font catalog: the logical families SuperDoc offers in font pickers, independent of whether each one
 * is bundled or used by the open document. DocFonts owns the evidence data; SuperDoc owns the small
 * picker-facing shape and keeps resolver activation asset-gated elsewhere.
 */
import { FONT_OFFERINGS, type FontGeneric } from './font-offerings';
import { BUNDLED_MANIFEST } from './bundled-manifest';

/**
 * One toolbar-selectable font. `logicalFamily` is the label, the value applied to the selection, and the
 * name export preserves - never a physical clone. `previewFamily` is render-only (see below).
 */
export interface FontCatalogEntry {
  /** Word-facing logical family: the toolbar label and the value stored + exported (e.g. "Georgia"). */
  logicalFamily: string;
  /** CSS generic that terminates the family's fallback stack (e.g. "serif"). */
  generic: FontGeneric;
  /**
   * Family the dropdown PREVIEW renders in: the bundled physical clone when SuperDoc actually ships an
   * asset that paints it (Calibri previews as Carlito), otherwise the logical family itself (Georgia
   * previews as Georgia, because SuperDoc does not bundle Gelasio). Never a customer-facing support
   * label such as "Needs font" or "Fallback".
   */
  previewFamily: string;
}

interface CatalogSourceRow {
  logicalFamily: string;
  generic: FontGeneric;
  physicalFamily: string | null;
}

const BUNDLED_FAMILIES: ReadonlySet<string> = new Set(BUNDLED_MANIFEST.map((f) => f.family));

/** Normalize a family for dedupe: trim, strip surrounding quotes, lowercase (matches the resolver key). */
function normalizeFamily(family: string): string {
  return family
    .trim()
    .replace(/^["']|["']$/g, '')
    .toLowerCase();
}

function compareByLogicalFamily(a: FontCatalogEntry, b: FontCatalogEntry): number {
  return a.logicalFamily.localeCompare(b.logicalFamily, 'en', { sensitivity: 'base' });
}

/**
 * The family the dropdown row previews in. The physical clone is used ONLY when SuperDoc ships an asset
 * that paints it (mirrors the resolver's asset gate, so the preview never advertises a clone the runtime
 * cannot render); otherwise the logical family previews as itself.
 */
function previewFamilyFor(logicalFamily: string, physicalFamily: string | null): string {
  return physicalFamily && BUNDLED_FAMILIES.has(physicalFamily) ? physicalFamily : logicalFamily;
}

/**
 * AIDEV-NOTE: compat-fallback - @docfonts/fallbacks@0.6.0 has evidence rows but no dedicated toolbar
 * catalog export. When DocFonts publishes the catalog, replace this projection with that export in the
 * same package-bump PR.
 */
function offeringCatalogRows(): CatalogSourceRow[] {
  return FONT_OFFERINGS.map((offering) => ({
    logicalFamily: offering.logicalFamily,
    generic: offering.generic,
    physicalFamily: offering.physicalFamily,
  }));
}

function deriveCatalog(): FontCatalogEntry[] {
  const rows = offeringCatalogRows();
  const seen = new Set<string>();
  const entries: FontCatalogEntry[] = [];
  for (const row of rows) {
    const key = normalizeFamily(row.logicalFamily);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    entries.push({
      logicalFamily: row.logicalFamily,
      generic: row.generic,
      previewFamily: previewFamilyFor(row.logicalFamily, row.physicalFamily),
    });
  }
  return entries.sort(compareByLogicalFamily);
}

/** The full toolbar catalog, sorted alphabetically and deduped by normalized logical family. */
export const FONT_CATALOG: readonly FontCatalogEntry[] = Object.freeze(deriveCatalog());

/** A fresh copy of the toolbar catalog (sorted + deduped), so callers can sort / extend it in place. */
export function getToolbarFontCatalog(): FontCatalogEntry[] {
  return FONT_CATALOG.map((entry) => ({ ...entry }));
}

/** The logical CSS stack stored / applied when a catalog font is chosen, e.g. "Georgia, serif". */
export function fontCatalogStack(entry: FontCatalogEntry): string {
  return `${entry.logicalFamily}, ${entry.generic}`;
}

/**
 * The toolbar catalog in the generic `{ label, value }` shape: `label` is the Word-facing logical name
 * (stored / exported), `value` is the logical CSS stack applied to the run. Used by toolbar surfaces that
 * want the catalog as plain options (e.g. the headless toolbar's static defaults). The built-in Vue
 * toolbar builds its own richer `FontConfig` from {@link getToolbarFontCatalog}.
 */
export function getToolbarFontFamilyOptions(): { label: string; value: string }[] {
  return getToolbarFontCatalog().map((entry) => ({ label: entry.logicalFamily, value: fontCatalogStack(entry) }));
}

/** The preview CSS stack for the dropdown row, e.g. "Carlito, sans-serif" for Calibri. */
export function fontCatalogPreviewStack(entry: FontCatalogEntry): string {
  return `${entry.previewFamily}, ${entry.generic}`;
}
