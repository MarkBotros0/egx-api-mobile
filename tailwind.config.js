/** @type {import('tailwindcss').Config} */
// Colours come from the web repo's lib/theme.ts (synced into src/shared), so
// the two apps cannot drift. Fonts: React Native cannot synthesise weights for
// custom fonts, so each weight is its own family — use font-sans-semibold,
// never font-semibold.
// The .ts file resolves because Tailwind/NativeWind load this config through jiti (a plain `node` require would fail).
const { COLORS } = require("./src/shared/theme");

module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: { ...COLORS },
      fontFamily: {
        sans: ["Outfit_400Regular"],
        "sans-medium": ["Outfit_500Medium"],
        "sans-semibold": ["Outfit_600SemiBold"],
        "sans-bold": ["Outfit_700Bold"],
        mono: ["JetBrainsMono_400Regular"],
        "mono-semibold": ["JetBrainsMono_600SemiBold"],
      },
    },
  },
  plugins: [],
};
