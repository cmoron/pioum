/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette beige/pêche/orange chaleureuse
        primary: {
          50: '#fffbf5',   // Très léger crème
          100: '#fff4e6',  // Crème pâle
          200: '#fee6b8',  // Beige pêche (header actuel)
          300: '#fdd89f',  // Beige doré
          400: '#f5c57d',  // Pêche moyen
          500: '#e8a855',  // Orange doux
          600: '#d48d3a',  // Orange moyen
          700: '#c66e24',  // Orange/marron chaud (texte actuel)
          800: '#a85a1f',  // Marron terracotta
          900: '#8a481a',  // Marron foncé
          950: '#6d3814',  // Marron très foncé
        },
        // Accent complémentaire pour les highlights
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',  // Jaune d'or
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Fond cassé pour éviter le blanc pur
        paper: '#fffdf5',
        warm: '#fee6b8',    // Beige pêche
        warmDark: '#f5d89e', // Beige foncé pour bordures
        // Couleur sombre chaleureuse
        dark: '#3d2517',    // Marron foncé chaud
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'warm': '0 1px 3px 0 rgba(198, 110, 36, 0.1), 0 1px 2px 0 rgba(198, 110, 36, 0.06)',
        'warm-md': '0 4px 6px -1px rgba(198, 110, 36, 0.1), 0 2px 4px -1px rgba(198, 110, 36, 0.06)',
        'warm-lg': '0 10px 15px -3px rgba(198, 110, 36, 0.1), 0 4px 6px -2px rgba(198, 110, 36, 0.05)',
        'warm-xl': '0 20px 25px -5px rgba(198, 110, 36, 0.1), 0 10px 10px -5px rgba(198, 110, 36, 0.04)',
      },
      borderRadius: {
        'warm': '0.75rem',
      }
    },
  },
  plugins: [],
}
