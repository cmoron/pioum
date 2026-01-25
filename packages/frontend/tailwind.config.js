/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // REMPLACEMENT: On passe du Bleu à un Orange "Coucher de soleil" (Chaud)
        primary: {
          50: '#fff7ed',  // Crème très léger
          100: '#ffedd5', // Pêche pâle
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Ton orange principal (Vif)
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12', // Marron chaud
          950: '#431407', // Presque noir, mais teinte chocolat
        },
        // AJOUT: Une couleur secondaire Jaune pour le coté "Cartoon/Fun"
        secondary: '#FCD34D', // Un jaune d'or
        // AJOUT: Une couleur de fond cassée (évite le blanc pur froid)
        paper: '#FFFDF5', 
        // AJOUT: Une couleur sombre pour les contours (plus chaud que le noir #000)
        dark: '#292524', // Un gris très chaud / noir charbon
      },
      fontFamily: {
        // Changement suggéré : 'Nunito' ou 'Fredoka' font plus cartoon que 'Inter'
        sans: ['"Nunito"', 'sans-serif'], 
        cartoon: ['"Fredoka"', 'cursive'], // Optionnel pour les gros titres
      },
      // LE SECRET DU CARTOON : Les ombres dures (Hard Shadows)
      boxShadow: {
        'comic': '4px 4px 0px 0px #292524', // Ombre noire décalée sans flou
        'comic-hover': '2px 2px 0px 0px #292524', // Effet enfoncé
      },
      // Des bordures bien rondes
      borderRadius: {
        'box': '1rem',
      }
    },
  },
  plugins: [],
}
