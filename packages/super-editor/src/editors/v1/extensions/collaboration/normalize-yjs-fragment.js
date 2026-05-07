import { XmlElement } from 'yjs';

const CROSS_REFERENCE_NODE_NAME = 'crossReference';

/**
 * Imported Word cross references can carry cached result runs in the shared
 * Yjs XML, but the ProseMirror node is intentionally a leaf atom. Strip only
 * those cached Yjs children before y-prosemirror hydrates the fragment.
 *
 * @param {import('yjs').XmlFragment | null | undefined} fragment
 * @returns {boolean}
 */
export function normalizeYjsFragmentForSchema(fragment) {
  if (!isTraversableYjsXml(fragment)) return false;

  let changed = false;
  const normalize = () => {
    changed = stripCrossReferenceChildren(fragment) || changed;
  };

  if (fragment.doc) {
    fragment.doc.transact(normalize);
  } else {
    normalize();
  }

  return changed;
}

/**
 * @param {Array<{ target?: unknown }> | null | undefined} events
 * @param {import('yjs').XmlFragment | null | undefined} fallbackFragment
 * @returns {boolean}
 */
export function normalizeYjsFragmentEventsForSchema(events, fallbackFragment) {
  if (!Array.isArray(events) || events.length === 0) {
    return normalizeYjsFragmentForSchema(fallbackFragment);
  }

  let changed = false;
  const visited = new Set();
  for (const event of events) {
    const target = event?.target;
    if (!isTraversableYjsXml(target) || visited.has(target)) continue;
    visited.add(target);
    changed = stripCrossReferenceChildren(target) || changed;
  }

  return changed;
}

/**
 * @param {import('yjs').XmlFragment | import('yjs').XmlElement} parent
 * @returns {boolean}
 */
function stripCrossReferenceChildren(parent) {
  if (!isTraversableYjsXml(parent)) return false;

  if (parent instanceof XmlElement && parent.nodeName === CROSS_REFERENCE_NODE_NAME) {
    if (parent.length === 0) return false;
    parent.delete(0, parent.length);
    return true;
  }

  let changed = false;

  for (const child of parent.toArray()) {
    if (!(child instanceof XmlElement)) continue;

    if (child.nodeName === CROSS_REFERENCE_NODE_NAME) {
      if (child.length > 0) {
        child.delete(0, child.length);
        changed = true;
      }
      continue;
    }

    changed = stripCrossReferenceChildren(child) || changed;
  }

  return changed;
}

function isTraversableYjsXml(value) {
  return Boolean(value && typeof value.toArray === 'function');
}
