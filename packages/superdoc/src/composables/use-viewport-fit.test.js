import { describe, it, expect } from 'vitest';
import {
  FIT_WIDTH_DEFAULTS,
  resolveFitWidthOptions,
  computeFitZoom,
  computeAppliedFitZoom,
} from './use-viewport-fit.js';

// Full wiring (watchers, metric storage, emit dedup, mode-driven fit
// application) is covered through the component in src/SuperDoc.test.js;
// these tests lock the pure helpers.

describe('resolveFitWidthOptions', () => {
  it('returns defaults when options are absent or not an object', () => {
    const defaults = {
      min: FIT_WIDTH_DEFAULTS.min,
      max: FIT_WIDTH_DEFAULTS.max,
      padding: FIT_WIDTH_DEFAULTS.padding,
    };
    expect(resolveFitWidthOptions(undefined)).toEqual(defaults);
    expect(resolveFitWidthOptions(null)).toEqual(defaults);
    expect(resolveFitWidthOptions('fit')).toEqual(defaults);
  });

  it('accepts explicit bounds and padding', () => {
    expect(resolveFitWidthOptions({ min: 35, max: 150, padding: 24 })).toEqual({
      min: 35,
      max: 150,
      padding: 24,
    });
  });

  it('reorders swapped min/max', () => {
    const options = resolveFitWidthOptions({ min: 150, max: 35 });
    expect(options.min).toBe(35);
    expect(options.max).toBe(150);
  });

  it('falls back to defaults for invalid field values', () => {
    expect(resolveFitWidthOptions({ min: -5, max: NaN, padding: -1 })).toEqual({
      min: FIT_WIDTH_DEFAULTS.min,
      max: FIT_WIDTH_DEFAULTS.max,
      padding: FIT_WIDTH_DEFAULTS.padding,
    });
    expect(resolveFitWidthOptions({ min: '50', padding: '10' })).toEqual({
      min: FIT_WIDTH_DEFAULTS.min,
      max: FIT_WIDTH_DEFAULTS.max,
      padding: FIT_WIDTH_DEFAULTS.padding,
    });
  });

  it('accepts zero padding', () => {
    expect(resolveFitWidthOptions({ padding: 0 }).padding).toBe(0);
  });
});

describe('computeFitZoom', () => {
  it('computes the rounded percentage that fits the document', () => {
    expect(computeFitZoom(816, 816)).toBe(100);
    expect(computeFitZoom(600, 816)).toBe(74);
    expect(computeFitZoom(1200, 816)).toBe(147);
  });

  it('returns null for non-positive inputs', () => {
    expect(computeFitZoom(0, 816)).toBeNull();
    expect(computeFitZoom(-10, 816)).toBeNull();
    expect(computeFitZoom(600, 0)).toBeNull();
    expect(computeFitZoom(NaN, 816)).toBeNull();
  });
});

describe('computeAppliedFitZoom', () => {
  const options = { min: 35, max: 100, padding: 0 };

  it('passes through values inside the bounds', () => {
    expect(computeAppliedFitZoom(600, 816, options)).toBe(74);
  });

  it('clamps below min and above max', () => {
    expect(computeAppliedFitZoom(200, 816, options)).toBe(35);
    expect(computeAppliedFitZoom(1200, 816, options)).toBe(100);
  });

  it('reserves padding before computing the fit', () => {
    expect(computeAppliedFitZoom(912, 816, { ...options, padding: 96 })).toBe(100);
  });

  it('returns null when padding consumes the available width', () => {
    expect(computeAppliedFitZoom(90, 816, { ...options, padding: 96 })).toBeNull();
  });
});
