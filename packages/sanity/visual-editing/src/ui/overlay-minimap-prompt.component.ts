import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-minimap-prompt',
  template: `
    <div class="prompt">
      <kbd>Shift</kbd>
      <span>Zoom Out</span>
      <span aria-hidden="true">↗</span>
    </div>
  `,
  styles: `
    .prompt {
      align-items: center;
      background: #fff;
      border-radius: 6px;
      bottom: 2rem;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      color: #1f2937;
      display: flex;
      font-family:
        Inter,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        sans-serif;
      font-size: 12px;
      font-weight: 600;
      gap: 8px;
      left: 2rem;
      line-height: 16px;
      padding: 6px 8px;
      pointer-events: none;
      position: fixed;
      z-index: 999999;
    }

    kbd {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      color: #374151;
      font-family: inherit;
      font-size: 11px;
      line-height: 14px;
      padding: 1px 5px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverlayMinimapPromptComponent {}
