import type { PortableTextBlock } from '@portabletext/types';

const input: PortableTextBlock = {
  _type: 'block',
  children: [
    {
      _key: 'a1ph4',
      _type: 'span',
      marks: ['mark1'],
      text: 'Sanity',
    },
  ],
  markDefs: [
    {
      _key: 'mark1',
      _type: 'link',
      href: 'https://sanity.io',
    },
  ],
};

export default {
  input,
  output: '<p><a href="https://sanity.io" class="mahlink">Sanity</a></p>',
};
