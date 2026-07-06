/** @type {import('tailwindcss').Config} */
export default {
    // Toggled by adding/removing `dark` on <html> (see src/helpers/theme.js).
    darkMode: 'class',
    content: [
        './index.html',
        './src/**/*.{vue,js}',
    ],
    theme: {
        extend: {},
    },
    plugins: [],
};
