export const themeColors = {
  white: '#ffffff',
  // Pale / Baby Pink #F4C2C2
  palePink: '#F4C2C2',
  palePinkHover: '#ebafaf',
  palePinkActive: '#e09d9d',
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

export const appTheme = {
  global: {
    colors: {
      brand: themeColors.palePink,
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
        color: '#F4C2C2',
      },
      border: {
        radius: '4px',
        width: '0px',
      },
      color: '#1a1a1a',
      padding: {
        vertical: '8px',
        horizontal: '16px',
      },
      // Grommet only themes hover via hoverIndicator, so state colours live here
      extend: `
        font-weight: 500;
        transition: background-color 0.15s ease, transform 0.05s ease;
        &:hover:not(:disabled) {
          background-color: #ebafaf;
        }
        &:active:not(:disabled) {
          background-color: #e09d9d;
          transform: translateY(1px);
        }
      `,
    },
  },
};

