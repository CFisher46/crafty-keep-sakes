export const themeColors = {
  white: '#ffffff',
  // Pale / Baby Pink #F4C2C2
  palePink: '#F4C2C2',
  palePinkHover: '#d9cebe',
  palePinkActive: '#cdc0ad',
  // Pale / Baby Blue #89CFF0
  paleBlue: '#89CFF0',
  paleBlueHover: '#76bfe4',
  paleBlueLight: '#eef7fd',
  // Pale / Baby Yellow #FFFCC9
  paleYellow: '#FFFCC9',
  paleYellowHover: '#f8f4b0',
  paleYellowLight: '#fffef0',
  // Pale / Baby Green #D1F3C5
  paleGreen: '#D1F3C5',
  paleGreenHover: '#bde7af',
  paleGreenLight: '#f4fbf1',
  neutralSoft: '#fafafa',
  borderSoft: '#f0e6ec',
};

// Atelier palette: warm ivory, ink and sage
export const ui = {
  page: '#FAF8F5',
  sand: '#F1ECE4',
  line: '#E4DDD3',
  ink: '#2B2623',
  inkHover: '#4A413B',
  muted: '#6F675F',
  accent: '#5E7060',
  serif: 'Georgia, "Times New Roman", serif',
};

export const appTheme = {
  layer: { zIndex: '200' },
  global: {
    drop: { zIndex: '300' },
    colors: {
      brand: ui.accent,
      background: ui.page,
      text: ui.ink,
      'pale-pink': themeColors.palePink,
      'pale-blue': themeColors.paleBlue,
      'pale-yellow': themeColors.paleYellow,
      'pale-green': themeColors.paleGreen,
    },
    font: {
      family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    },
  },
  button: {
    default: {
      background: {
        color: '#E6DDD0',
      },
      border: {
        radius: '4px',
        width: '0px',
      },
      color: ui.ink,
      padding: {
        vertical: '8px',
        horizontal: '16px',
      },
      // Grommet only themes hover via hoverIndicator, so state colours live here
      extend: `
        font-weight: 500;
        transition: background-color 0.15s ease, transform 0.05s ease;
        &:hover:not(:disabled) {
          background-color: #d9cebe;
        }
        &:active:not(:disabled) {
          background-color: #cdc0ad;
          transform: translateY(1px);
        }
      `,
    },
  },
};

