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
    '<div style="display: none;">[@limitless-angular/sanity/portabletext] Unknown block type &quot;block&quot;, specify a component for it in the `components.types` prop</div>',
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
    '<div style="display: none;">[@limitless-angular/sanity/portabletext] Unknown block type &quot;not-a-valid-block-type&quot;, specify a component for it in the `components.types` prop</div>',
};

export default {
  missingSpanChildren,
  invalidMarkReferences,
  invalidBlockType,
};
