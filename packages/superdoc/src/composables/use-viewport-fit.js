import { onBeforeUnmount, nextTick, watch } from 'vue';

const CSS_PX_PER_INCH = 96;
const SIDEBAR_SELECTOR = '.superdoc__right-sidebar';

export const FIT_WIDTH_DEFAULTS = Object.freeze({
  min: 10,
  max: 100,
  padding: 0,
});

// Normalize `config.zoom.fitWidth` into a complete options object. The mode
// (`config.zoom.mode` / `setZoomMode`) decides whether the policy applies;
// these are only its bounds. Invalid field values fall back to defaults;
// min/max are reordered if swapped.
export const resolveFitWidthOptions = (rawFitConfig) => {
  const raw = rawFitConfig && typeof rawFitConfig === 'object' ? rawFitConfig : {};
  const positiveOr = (value, fallback) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
  const min = positiveOr(raw.min, FIT_WIDTH_DEFAULTS.min);
  const max = positiveOr(raw.max, FIT_WIDTH_DEFAULTS.max);
  const padding =
    typeof raw.padding === 'number' && Number.isFinite(raw.padding) && raw.padding >= 0
      ? raw.padding
      : FIT_WIDTH_DEFAULTS.padding;

  return {
    min: Math.min(min, max),
    max: Math.max(min, max),
    padding,
  };
};

// Unclamped zoom percentage that fits `documentWidth` into `availableWidth`.
export const computeFitZoom = (availableWidth, documentWidth) => {
  if (!(availableWidth > 0) || !(documentWidth > 0)) return null;
  return Math.round((availableWidth / documentWidth) * 100);
};

// Applied zoom for the fit-width policy: padding reserved, then clamped.
export const computeAppliedFitZoom = (availableWidth, documentWidth, options) => {
  const padded = computeFitZoom(availableWidth - options.padding, documentWidth);
  if (padded === null) return null;
  return Math.round(Math.min(options.max, Math.max(options.min, padded)));
};

/**
 * Viewport fit tracking. Maintains pure viewport metrics (available width,
 * document base width, fit zoom), stores them for `getViewportMetrics()`,
 * emits `viewport-change` when they change, and applies the `fit-width`
 * policy while `zoomMode` is `'fit-width'`.
 *
 * Metrics are policy-free measurements: `availableWidth` is the container
 * width minus the comments sidebar when visible; `fitZoom` is the raw
 * available/document ratio. The fit policy (and only the policy) accounts
 * for `config.zoom.fitWidth` padding and clamping.
 *
 * The base page width is re-resolved on every evaluation (never latched)
 * and comes from the page styles first, which are zoom-independent: a zoom
 * applied before the first measurement (`zoom.initial`, `setZoom()` in
 * `onReady`) cannot corrupt the ratio. DOM measurement, normalized by the
 * active zoom, is the fallback when page styles are unavailable.
 *
 * The fit application writes the zoom state directly instead of calling
 * `setZoom()`, which by contract switches the mode to `manual`.
 *
 * Must be called inside a component `setup()` (registers watchers and an
 * unmount hook).
 */
export function useViewportFit({
  getSuperdoc,
  superdocContainerWidth,
  isReady,
  activeZoom,
  zoomMode,
  viewportMetrics,
  showCommentsSidebar,
  superdocRoot,
}) {
  const resolveBaseDocumentWidth = () => {
    const superdoc = getSuperdoc();
    // Without an editor there is no document to measure: the document
    // element before editor mount is shell scaffolding whose width is
    // container-derived, which would produce a garbage base.
    if (!superdoc?.activeEditor) return null;

    let pageStyles = null;
    try {
      pageStyles = superdoc.activeEditor.getPageStyles?.() ?? null;
    } catch {
      pageStyles = null;
    }
    const pageWidthInches = pageStyles?.pageSize?.width;
    if (typeof pageWidthInches === 'number' && Number.isFinite(pageWidthInches) && pageWidthInches > 0) {
      return pageWidthInches * CSS_PX_PER_INCH;
    }

    const docEl = superdocRoot.value?.querySelector?.('.superdoc__document');
    const measured = Number(docEl?.clientWidth) || Number(docEl?.getBoundingClientRect?.().width) || 0;
    if (measured > 0) {
      // The measured element scales with zoom; divide it back out so the
      // returned width is the document's natural size.
      const zoomFactor = (activeZoom.value ?? 100) / 100;
      return zoomFactor > 0 ? measured / zoomFactor : measured;
    }

    return null;
  };

  // Width the comments sidebar takes from the container when visible.
  const resolveSidebarWidth = () => {
    if (!showCommentsSidebar?.value) return 0;
    const sidebarEl = superdocRoot.value?.querySelector?.(SIDEBAR_SELECTOR);
    const measured = Number(sidebarEl?.offsetWidth) || Number(sidebarEl?.getBoundingClientRect?.().width) || 0;
    return measured > 0 ? measured : 0;
  };

  const applyFitWidth = (superdoc, metrics) => {
    const options = resolveFitWidthOptions(superdoc.config?.zoom?.fitWidth);
    const target = computeAppliedFitZoom(metrics.availableWidth, metrics.documentWidth, options);
    if (target === null) return;
    // Same-value guard: applying the fit re-triggers viewport evaluation
    // through the render pipeline; skipping no-op zooms is what terminates
    // that cycle (the base width is zoom-independent, so the recomputed
    // target is stable).
    if (target === activeZoom.value) return;
    // Write the zoom state directly: setZoom() would flip the mode to
    // manual. The activeZoom watcher in SuperDoc.vue propagates the value
    // to all presentation surfaces exactly as setZoom() does.
    activeZoom.value = target;
    superdoc.emit('zoomChange', { zoom: target, mode: 'fit-width' });
  };

  const evaluateViewport = () => {
    const superdoc = getSuperdoc();
    if (!superdoc) return;

    const containerWidth = superdocContainerWidth.value;
    if (!(containerWidth > 0)) return;
    if (!isReady.value) return;

    const documentWidth = resolveBaseDocumentWidth();
    // No measurable document yet (editors still mounting): skip instead of
    // storing a guessed width; the editorCreate/pagination hooks re-run this.
    if (documentWidth === null) return;

    const availableWidth = containerWidth - resolveSidebarWidth();
    const fitZoom = computeFitZoom(availableWidth, documentWidth);
    if (fitZoom === null) return;

    const metrics = { availableWidth, documentWidth, fitZoom };

    // Store and emit when the measurements change, including base-width
    // changes (page size or orientation) at a constant available width.
    const previous = viewportMetrics.value;
    const changed =
      !previous ||
      previous.fitZoom !== fitZoom ||
      Math.round(previous.documentWidth) !== Math.round(documentWidth) ||
      Math.round(previous.availableWidth) !== Math.round(availableWidth);
    if (changed) {
      viewportMetrics.value = metrics;
      superdoc.emit('viewport-change', metrics);
    }

    // The fit policy re-applies on every evaluation while in fit-width mode.
    // That is safe: leaving the mode requires setZoom()/setZoomMode(), and
    // the same-value guard makes repeat applications no-ops.
    if (zoomMode.value === 'fit-width') {
      applyFitWidth(superdoc, metrics);
    }
  };

  watch(superdocContainerWidth, evaluateViewport);
  watch(isReady, (ready) => {
    if (ready) evaluateViewport();
  });
  // Entering fit-width applies the fit immediately; the sidebar changes the
  // available width without resizing the observed container, so re-measure
  // after it mounts/unmounts.
  watch(zoomMode, (mode) => {
    if (mode === 'fit-width') evaluateViewport();
  });
  if (showCommentsSidebar) {
    watch(showCommentsSidebar, () => {
      nextTick(() => evaluateViewport());
    });
  }

  // Editors mount after store readiness, and page geometry can change
  // without a container resize (orientation, margins, document swap).
  // Re-evaluate on the editor lifecycle signals that change the base width.
  const handleEditorCreate = () => {
    nextTick(() => evaluateViewport());
  };
  const handlePaginationUpdate = () => {
    evaluateViewport();
  };

  const superdocAtSetup = getSuperdoc();
  superdocAtSetup?.on?.('editorCreate', handleEditorCreate);
  superdocAtSetup?.on?.('pagination-update', handlePaginationUpdate);
  onBeforeUnmount(() => {
    superdocAtSetup?.off?.('editorCreate', handleEditorCreate);
    superdocAtSetup?.off?.('pagination-update', handlePaginationUpdate);
  });

  return { evaluateViewport };
}
