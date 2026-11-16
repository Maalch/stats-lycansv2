import { describe, it, expect } from 'vitest';
import { parseRelatedClipIds } from './clipUtils';

describe('parseRelatedClipIds', () => {
  it.each([
    ['585,590,591', ['585', '590', '591']],
    ['585.590.591', ['585', '590', '591']],
    ['585, 590.591', ['585', '590', '591']],
  ])('parses related clip IDs from "%s"', (relatedClips, expected) => {
    expect(parseRelatedClipIds(relatedClips)).toEqual(expected);
  });
});
