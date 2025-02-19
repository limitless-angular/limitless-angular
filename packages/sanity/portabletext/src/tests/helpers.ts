import { expect } from 'vitest';
import { ComponentInput, render } from '@testing-library/angular';
import { PortableTextComponent } from '../components/portable-text.component';

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
  input: ComponentInput<PortableTextComponent>['value'],
  components: ComponentInput<PortableTextComponent>['components'] = {},
  onMissingComponent: ComponentInput<PortableTextComponent>['onMissingComponent'] = false,
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return render(PortableTextComponent as any, {
    inputs: { value: input, components, onMissingComponent },
  });
};
