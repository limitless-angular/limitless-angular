import type { ArbitraryTypedObject } from '@portabletext/types';

const missingSpanChildren = {
  input: [
    {
      _type: 'block',
      _key: 'missing-children',
      style: 'normal',
      // Missing children array
    },
  ],
  output:
    '<div aria-hidden="true" style="display: none;">Unknown block type: block</div>',
};

const invalidMarkReferences = {
  input: [
    {
      _type: 'block',
      _key: 'invalid-mark-ref',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'span1',
          text: 'This span references a non-existent mark',
          marks: ['non-existent-mark-def'],
        },
      ],
      markDefs: [],
    },
  ],
  output:
    '<p><span class="unknown__pt__mark__non-existent-mark-def">This span references a non-existent mark</span></p>',
};

const invalidBlockType = {
  input: [
    {
      _type: 'not-a-valid-block-type',
      _key: 'invalid-block',
      text: 'This is not a valid block structure',
    },
  ],
  output:
    '<div aria-hidden="true" style="display: none;">Unknown block type: not-a-valid-block-type</div>',
};

export default {
  missingSpanChildren,
  invalidMarkReferences,
  invalidBlockType,
};
