import type { Config } from 'tailwindcss'

// Colour tokens are CSS variables (see globals.css) so light/dark share one class set.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: v('brand-50'),
          100: v('brand-100'),
          200: v('brand-200'),
          500: v('brand-500'),
          600: v('brand-600'),
          700: v('brand-700'),
        },
        canvas: v('canvas'),
        panel: v('panel'),
        sunken: v('sunken'),
        line: v('line'),
        ink: v('ink'),
        mute: v('mute'),
        bubble: v('bubble'),
        online: '#22c55e',
        away: '#f59e0b',
      },
      fontFamily: { sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: {
        card: '0 1px 2px rgb(60 40 140 / 0.06), 0 8px 24px -12px rgb(60 40 140 / 0.18)',
        pop: '0 12px 40px -8px rgb(60 40 140 / 0.35)',
      },
    },
  },
  plugins: [],
}
export default config
