import { expect } from 'vitest';
import { aliasedInput, render } from '@testing-library/angular';
import { PortableTextComponent } from '../components/portable-text.component';
import { TypedObject } from '@portabletext/types';
import { PortableTextComponents, MissingComponentHandler } from '../types';

const cleanAngularHTML = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Remove Angular comment nodes and template bindings
  const walker = document.createTreeWalker(doc, NodeFilter.SHOW_ALL);
  const nodesToRemove: Node[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;

    // Remove Angular comment nodes
    if (node.nodeType === Node.COMMENT_NODE) {
      nodesToRemove.push(node);
    }
    // Remove Angular template bindings from elements
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.startsWith('_ng') || attr.name.startsWith('ng-reflect')) {
          el.removeAttribute(attr.name);
        }
      });
    }
  }

  // Remove collected nodes in reverse order to avoid breaking the tree
  nodesToRemove.reverse().forEach((node) => node.parentNode?.removeChild(node));

  return doc.body.innerHTML
    .replace(/\s*<!--.*?-->\s*/g, '') // Remove any remaining comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/> </g, '><') // Remove space between tags
    .trim();
};

export const assertHTML = (container: Element, expectedHTML: string) => {
  const actual = cleanAngularHTML(container.innerHTML);
  const expected = cleanAngularHTML(expectedHTML);
  expect(actual).toBe(expected);
};

export const renderPortableText = (
  input: TypedObject | TypedObject[],
  components: Partial<PortableTextComponents> = {},
  onMissingComponent: MissingComponentHandler | false = false,
) =>
  render(PortableTextComponent, {
    inputs: {
      value: input,
      ...aliasedInput('components', components),
      onMissingComponent,
    },
  });
