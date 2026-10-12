import { appTheme } from './theme';
import { buttonStyles } from './formatting';

describe('button theme', () => {
  it('defines hover and pressed styles for enabled buttons', () => {
    const extend = appTheme.button.default.extend;

    expect(extend).toMatch(/&:hover:not\(:disabled\)\s*{[^}]*background-color:\s*#d9cebe/);
    expect(extend).toMatch(/&:active:not\(:disabled\)\s*{[^}]*background-color:\s*#cdc0ad/);
  });

  it('does not set an inline background that would override the hover styles', () => {
    expect(buttonStyles.default).not.toHaveProperty('backgroundColor');
  });
});
