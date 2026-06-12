import { describe, expect, it } from 'vitest';
import { content } from '../src/index.js';
import { checkReferentialIntegrity } from '../src/gates.js';

describe('referential integrity (content-schema Part I)', () => {
  it('every cross-reference in launch content resolves', () => {
    expect(checkReferentialIntegrity(content)).toEqual([]);
  });

  it('detects dangling references', () => {
    const broken = {
      ...content,
      activities: [
        {
          ...content.activities[0]!,
          id: 'activity.broken',
          skillId: 'skill.nonexistent',
          inputs: [{ itemId: 'item.nonexistent', qty: 1 }],
        },
      ],
    };
    const errors = checkReferentialIntegrity(broken);
    expect(errors.some((e) => e.includes('skill.nonexistent'))).toBe(true);
    expect(errors.some((e) => e.includes('item.nonexistent'))).toBe(true);
  });
});
