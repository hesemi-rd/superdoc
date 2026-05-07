import { describe, expect, it } from 'vitest';
import { Doc as YDoc, XmlElement } from 'yjs';
import { normalizeYjsFragmentEventsForSchema, normalizeYjsFragmentForSchema } from './normalize-yjs-fragment.js';

describe('normalizeYjsFragmentForSchema', () => {
  it('ignores non-Yjs fragment test doubles', () => {
    expect(normalizeYjsFragmentForSchema({ fragment: true })).toBe(false);
  });

  it('normalizes changed event target subtrees without walking the fallback fragment', () => {
    const ydoc = new YDoc();
    const root = ydoc.getXmlFragment('supereditor');
    const crossReference = new XmlElement('crossReference');
    crossReference.insert(0, [new XmlElement('run')]);
    root.insert(0, [crossReference]);
    const fallbackFragment = {
      toArray() {
        throw new Error('Expected event-scoped normalization to avoid full fragment traversal.');
      },
    };

    try {
      expect(normalizeYjsFragmentEventsForSchema([{ target: crossReference }], fallbackFragment)).toBe(true);
      expect(crossReference.length).toBe(0);
    } finally {
      ydoc.destroy();
    }
  });
});
