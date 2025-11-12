import { expect, test, describe, vi } from 'vitest';
import { aliasedInput, render, screen } from '@testing-library/angular';
import { PortableTextComponent } from '../components/portable-text.component';
import * as fixtures from './fixtures';
import { HighlightComponent } from './test-components/HighlightComponent';
import { CodeComponent } from './test-components/CodeComponent';
import { assertHTML } from './helpers';

describe('PortableText Dynamic Updates', () => {
  test('updates rendered content when input changes', async () => {
    // Render with initial content
    const { rerender, container } = await render(PortableTextComponent, {
      inputs: { value: fixtures.singleSpan.input },
    });

    assertHTML(container, fixtures.singleSpan.output);

    // Update to multiple spans
    await rerender({ inputs: { value: fixtures.multipleSpans.input } });

    assertHTML(container, fixtures.multipleSpans.output);
  });

  test('updates when changing from simple to complex content', async () => {
    // Render with initial content
    const { rerender, container } = await render(PortableTextComponent, {
      inputs: { value: fixtures.singleSpan.input },
    });

    assertHTML(container, fixtures.singleSpan.output);

    await rerender({ inputs: { value: fixtures.nestedLists.input } });

    assertHTML(container, fixtures.nestedLists.output);
  });

  test('updates when components configuration changes', async () => {
    // Render with initial content
    const { fixture, rerender } = await render(PortableTextComponent, {
      inputs: { value: fixtures.customMarks.input, onMissingComponent: false },
    });

    // Verify default rendering (no highlight class)
    expect(fixture.nativeElement.querySelector('.highlight')).toBeNull();

    // Add custom highlight component
    await rerender({
      inputs: {
        ...aliasedInput('components', {
          marks: { highlight: HighlightComponent },
        }),
      },
      partialUpdate: true,
    });

    // Verify custom component applied
    expect(fixture.nativeElement.querySelector('.highlight')).not.toBeNull();
  });

  test('handles switching between different block types', async () => {
    // Render with initial content
    const { rerender, fixture } = await render(PortableTextComponent, {
      inputs: { value: fixtures.singleSpan.input },
    });

    // Start with normal text
    expect(screen.getByText('Plain text.')).toBeTruthy();

    // Switch to custom block type
    const customBlockFixture = fixtures.customBlockType;
    await rerender({
      inputs: {
        value: customBlockFixture.input,
        ...aliasedInput('components', {
          types: { code: CodeComponent },
        }),
      },
    });

    // Verify custom block rendered
    expect(fixture.nativeElement.querySelector('pre')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('code')).not.toBeNull();

    // Switch back to normal text
    await rerender({
      inputs: {
        value: fixtures.singleSpan.input,
        ...aliasedInput('components', {}),
      },
    });

    // Verify normal text rendered again
    expect(fixture.nativeElement.querySelector('pre')).toBeNull();
    expect(screen.getByText('Plain text.')).toBeTruthy();
  });

  test('handles null or undefined content gracefully', async () => {
    // Render with initial content
    const { fixture, rerender } = await render(PortableTextComponent, {
      inputs: {
        value: fixtures.singleSpan.input,
      },
    });

    // Set content to null
    await rerender({ inputs: { value: null } });

    // Should render empty without errors
    expect(fixture.nativeElement?.textContent?.trim()).toBe('');

    // Set content to undefined
    await rerender({ inputs: { value: undefined } });

    // Should render empty without errors
    expect(fixture.nativeElement?.textContent?.trim()).toBe('');

    // Set back to valid content
    await rerender({ inputs: { value: fixtures.singleSpan.input } });

    // Should render content again
    expect(screen.getByText('Plain text.')).toBeTruthy();
  });

  test('handles custom onMissingComponent handler', async () => {
    // Render with TestHost2Component that has onMissingComponent prop
    const onMissingComponent = vi.fn();
    const { rerender } = await render(PortableTextComponent, {
      inputs: { value: fixtures.customBlockType.input, onMissingComponent },
    });

    // Verify custom missing component handler is used
    expect(onMissingComponent).toHaveBeenCalled();
    onMissingComponent.mockClear();

    // Switch back to default handling
    await rerender({ inputs: { onMissingComponent: false } });

    // Verify default handling is used
    expect(onMissingComponent).not.toHaveBeenCalled();
  });
});
