// Design tokens from DESIGN.md. The only place raw values are allowed.

export const colors = {
  greenDark: "#014131",
  greenDark90: "#1A5446",
  greenDark80: "#34675A",
  greenDark70: "#4D7A6F",
  greenDark60: "#678D83",
  greenDark50: "#80A098",
  greenDark40: "#99B3AD",
  greenDark30: "#B3C6C1",
  greenDark20: "#CCD9D6",
  greenDark10: "#E6ECEA",
  red: "#FF2C00",
  red90: "#FF4119",
  red80: "#FF5633",
  red70: "#FF6B4D",
  red60: "#FF8066",
  red50: "#FF9680",
  red40: "#FFAB99",
  red30: "#FFC0B2",
  red20: "#FFD5CC",
  red10: "#FFEAE6",
  greenLight: "#87C38F",
  greenLight90: "#93C99A",
  greenLight80: "#9FCFA5",
  greenLight70: "#ABD5B1",
  greenLight60: "#B7DBBC",
  greenLight50: "#C3E1C7",
  greenLight40: "#CFE7D2",
  greenLight30: "#DBEDDD",
  greenLight20: "#E7F3E9",
  greenLight10: "#F3F9F4",
  beige: "#E7DED3",
  beige90: "#E9E1D7",
  beige80: "#ECE5DC",
  beige70: "#EEE8E0",
  beige60: "#F1EBE5",
  beige50: "#F3EEE9",
  beige40: "#F5F2ED",
  beige30: "#F8F5F2",
  beige20: "#FAF8F6",
  beige10: "#FDFCFB",
} as const;

// React Native needs one font family name per weight. These match the keys
// loaded in app/_layout.tsx.
export const fonts = {
  displayRegular: "RedHatDisplay_400Regular",
  displaySemibold: "RedHatDisplay_600SemiBold",
  displayBlack: "RedHatDisplay_900Black",
  bodyRegular: "Figtree_400Regular",
  bodySemibold: "Figtree_600SemiBold",
  bodyBlack: "Figtree_900Black",
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const borders = {
  width: 1,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

// A soft green-dark shadow under cards. iOS uses the shadow props, Android elevation.
export const shadows = {
  raised: {
    shadowColor: colors.greenDark,
    shadowOffset: { width: 0, height: spacing[1] },
    shadowOpacity: 0.08,
    shadowRadius: spacing[3],
    elevation: 2,
  },
} as const;

export const opacity = {
  disabled: 0.6,
  // The low point of a loading placeholder's pulse.
  pulse: 0.4,
} as const;

// Milliseconds. Loaders wait for `loaderDelay` so quick requests do not flash.
export const durations = {
  loaderDelay: 200,
  pulse: 700,
} as const;

// Smallest size of anything tappable.
export const minTouchSize = spacing[12];

export const logoWidth = spacing[16] * 4;

const LINE_HEIGHT_HEADING = 1.2;
const LINE_HEIGHT_BODY = 1.5;

// React Native line heights are absolute, so they are derived from the font size.
export const headingLineHeight = (fontSize: number): number => Math.round(fontSize * LINE_HEIGHT_HEADING);
export const bodyLineHeight = (fontSize: number): number => Math.round(fontSize * LINE_HEIGHT_BODY);
