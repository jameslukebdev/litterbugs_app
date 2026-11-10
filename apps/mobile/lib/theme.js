// Litterbugs brand tokens for the app, matched to the website
// (apps/web/components/public-website/brand.module.css and app/globals.css).
// Use these instead of typing colour values into screens.

export const colors = Object.freeze({
  white: '#FFFFFF',
  black: '#000000',

  // Brand purple (website --green / --green-dark / --green-soft)
  primaryDark: '#4438BB',
  primary: '#5146ED',
  primaryLight: '#A89AE0',
  primaryBorder: '#D8D1F0',
  primarySoft: '#EFEDFF',
  primaryTint: '#F9F7FF',

  // Text and surfaces (website --ink, body, --muted, --line, --soft)
  ink: '#292932',
  body: '#4A4857',
  muted: '#686477',
  subtle: '#9A97A6',
  lineStrong: '#CFCBDC',
  line: '#E3DFF0',
  mist: '#F4F3F7',
  soft: '#F8F7FC',

  // Report states: ladybug = needs a cleanup, caterpillar = being cleaned,
  // flower = cleaned up. Shown as the bug + coloured text on white.
  needsCleanup: '#A8323B',
  beingCleaned: '#2F6B3A',
  done: '#176350',
  doneBorder: '#B9E9DD',
  doneSoft: '#E2F8F3',
  expired: '#5C5966',

  // Accent inks with their hover tints (website footer and account nav)
  red: '#AC343B',
  redSoft: '#FFF0EE',
  yellow: '#775700',
  yellowSoft: '#FFF4CC',
  plum: '#783398',
  plumSoft: '#F7EBFB',

  // Fund (yellow) and Clean (lilac) action buttons
  fundFill: '#FFDA61',
  fundInk: '#493A10',
  fundEdge: '#D9AC19',
  cleanFill: '#F2E5FA',
  cleanInk: '#60237E',
  cleanEdge: '#CFA2E5',
});

// Nunito Black for headings, as on the website. Body text stays on the
// system font. Loaded in App.js with expo-font.
export const fonts = Object.freeze({
  heading: 'Nunito-Black',
});
