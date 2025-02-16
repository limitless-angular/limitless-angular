import * as fixtures from './fixtures';
import { MissingComponentHandler, PortableTextComponents } from '../types';
import { renderPortableText, assertHTML } from './helpers';
import { HighlightComponent } from './test-components/HighlightComponent';
import { RatingComponent } from './test-components/RatingComponent';
import { HardBreakComponent } from './test-components/HardBreakComponent';
import { LocalCurrencyComponent } from './test-components/LocalCurrencyComponent';
import { ButtonComponent } from './test-components/ButtonComponent';
import { SquareListComponent } from './test-components/SquareListComponent';
import { SquareListItemComponent } from './test-components/SquareListItemComponent';
import { CustomListItemComponent } from './test-components/CustomListItemComponent';
import { QuoteComponent } from './test-components/QuoteComponent';
import { LinkComponent } from './test-components/LinkComponent';
import { CodeComponent } from './test-components/CodeComponent';

describe('PortableTextComponent', () => {
  test('builds empty tree on empty block', async () => {
    const { input, output } = fixtures.emptyBlock;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('builds simple one-node tree on single, markless span', async () => {
    const { input, output } = fixtures.singleSpan;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('builds simple multi-node tree on markless spans', async () => {
    const { input, output } = fixtures.multipleSpans;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('builds annotated span on simple mark', async () => {
    const { input, output } = fixtures.basicMarkSingleSpan;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('builds annotated, joined span on adjacent, equal marks', async () => {
    const { input, output } = fixtures.basicMarkMultipleAdjacentSpans;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('builds annotated, nested spans in tree format', async () => {
    const { input, output } = fixtures.basicMarkNestedMarks;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('builds annotated spans with expanded marks on object-style marks', async () => {
    const { input, output } = fixtures.linkMarkDef;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('builds correct structure from advanced, nested mark structure', async () => {
    const { input, output } = fixtures.messyLinkText;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('builds bullet lists in parent container', async () => {
    const { input, output } = fixtures.basicBulletList;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('builds numbered lists in parent container', async () => {
    const { input, output } = fixtures.basicNumberedList;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('builds nested lists', async () => {
    const { input, output } = fixtures.nestedLists;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('builds all basic marks as expected', async () => {
    const { input, output } = fixtures.allBasicMarks;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('builds weirdly complex lists without any issues', async () => {
    const { input, output } = fixtures.deepWeirdLists;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('renders all default block styles', async () => {
    const { input, output } = fixtures.allDefaultBlockStyles;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('sorts marks correctly on equal number of occurences', async () => {
    const { input, output } = fixtures.marksAllTheWayDown;
    const marks: PortableTextComponents['marks'] = {
      highlight: HighlightComponent,
    };
    const result = await renderPortableText(input, { marks });
    assertHTML(result.container, output);
  });

  test('handles keyless blocks/spans', async () => {
    const { input, output } = fixtures.keyless;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('handles empty arrays', async () => {
    const { input, output } = fixtures.emptyArray;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('handles lists without level', async () => {
    const { input, output } = fixtures.listWithoutLevel;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('handles inline non-span nodes', async () => {
    const { input, output } = fixtures.inlineNodes;
    const result = await renderPortableText(input, {
      types: { rating: RatingComponent },
    });
    assertHTML(result.container, output);
  });

  test('handles hardbreaks', async () => {
    const { input, output } = fixtures.hardBreaks;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('can disable hardbreak component', async () => {
    const { input, output } = fixtures.hardBreaks;
    const result = await renderPortableText(input, { hardBreak: false });
    assertHTML(result.container, output.replace(/<br\/>/g, '\n'));
  });

  test('can customize hardbreak component', async () => {
    const { input, output } = fixtures.hardBreaks;
    const result = await renderPortableText(input, {
      hardBreak: HardBreakComponent,
    });
    assertHTML(
      result.container,
      output.replace(/<br\/>/g, '<br class="dat-newline"/>'),
    );
  });

  test('can nest marks correctly in block/marks context', async () => {
    const { input, output } = fixtures.inlineObjects;
    const result = await renderPortableText(input, {
      types: { localCurrency: LocalCurrencyComponent },
    });

    assertHTML(result.container, output);
  });

  test('can render inline block with text property', async () => {
    const { input, output } = fixtures.inlineBlockWithText;
    const result = await renderPortableText(input, {
      types: { button: ButtonComponent },
    });

    assertHTML(result.container, output);
  });

  test('can render styled list items', async () => {
    const { input, output } = fixtures.styledListItems;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('can render custom list item styles with fallback', async () => {
    const { input, output } = fixtures.customListItemType;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('can render custom list styles with provided list style component', async () => {
    const { input } = fixtures.customListItemType;
    const result = await renderPortableText(input, {
      list: { square: SquareListComponent },
    });
    assertHTML(
      result.container,
      '<ul class="list-squared"><li>Square 1</li><li>Square 2<ul><li>Dat disc</li></ul></li><li>Square 3</li></ul>',
    );
  });

  test('can render custom list item styles with provided list style component', async () => {
    const { input } = fixtures.customListItemType;
    const result = await renderPortableText(input, {
      listItem: { square: SquareListItemComponent },
    });
    assertHTML(
      result.container,
      '<ul><li class="item-squared">Square 1</li><li class="item-squared">Square 2<ul><li>Dat disc</li></ul></li><li class="item-squared">Square 3</li></ul>',
    );
  });

  test('warns on missing list style component', async () => {
    const { input } = fixtures.customListItemType;
    const result = await renderPortableText(input, { list: {} });
    assertHTML(
      result.container,
      '<ul><li>Square 1</li><li>Square 2<ul><li>Dat disc</li></ul></li><li>Square 3</li></ul>',
    );
  });

  test('can render styled list items with custom list item component', async () => {
    const { input, output } = fixtures.styledListItems;
    const result = await renderPortableText(input, {
      listItem: CustomListItemComponent,
    });
    assertHTML(result.container, output);
  });

  test('can specify custom component for custom block types', async () => {
    const { input, output } = fixtures.customBlockType;
    const result = await renderPortableText(input, {
      types: { code: CodeComponent },
    });

    assertHTML(result.container, output);
  });

  test('can specify custom component for custom block types with children', async () => {
    const { input, output } = fixtures.customBlockTypeWithChildren;
    const result = await renderPortableText(input, {
      types: { quote: QuoteComponent },
    });
    assertHTML(result.container, output);
  });

  test('can specify custom components for custom marks', async () => {
    const { input, output } = fixtures.customMarks;
    const result = await renderPortableText(input, {
      marks: { highlight: HighlightComponent },
    });
    assertHTML(result.container, output);
  });

  test('can specify custom components for defaults marks', async () => {
    const { input, output } = fixtures.overrideDefaultMarks;
    const result = await renderPortableText(input, {
      marks: { link: LinkComponent },
    });
    assertHTML(result.container, output);
  });

  test('falls back to default component for missing mark components', async () => {
    const { input, output } = fixtures.missingMarkComponent;
    const result = await renderPortableText(input);
    assertHTML(result.container, output);
  });

  test('can register custom `missing component` handler', async () => {
    let warning = '<never called>';
    const onMissingComponent: MissingComponentHandler = (message) => {
      warning = message;
    };

    const { input } = fixtures.missingMarkComponent;
    await renderPortableText(input, {}, onMissingComponent);
    expect(warning).toBe(
      '[@limitless-angular/sanity/portabletext] Unknown mark type "abc", specify a component for it in the `components.marks` prop',
    );
  });
});
