import { afterEach, describe, it, expect } from 'vitest';
import { isVisionDisabled } from './env-flags.js';

describe('isVisionDisabled', () => {
  const ORIGINAL = process.env['ENABLE_VISION'];

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env['ENABLE_VISION'];
    } else {
      process.env['ENABLE_VISION'] = ORIGINAL;
    }
  });

  const cases: Array<[string | undefined, boolean]> = [
    [undefined, false],   // default → vision enabled
    ['true', false],
    ['TRUE', false],
    ['1', false],
    ['yes', false],
    ['on', false],
    ['false', true],
    ['FALSE', true],
    ['0', true],
    ['no', true],
    ['off', true],
    ['OFF', true],
  ];

  for (const [value, expected] of cases) {
    it(`ENABLE_VISION=${JSON.stringify(value)} → isVisionDisabled()=${expected}`, () => {
      if (value === undefined) {
        delete process.env['ENABLE_VISION'];
      } else {
        process.env['ENABLE_VISION'] = value;
      }
      expect(isVisionDisabled()).toBe(expected);
    });
  }
});
