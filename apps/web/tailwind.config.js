/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#fffbf7',
                    100: '#FFF2DF', // 5
                    200: '#FFE0B2', // 4
                    300: '#e1c39a',
                    400: '#D3A376', // 3
                    500: '#af886c',
                    600: '#8C6E63', // 2
                    700: '#6e5148',
                    800: '#543932',
                    900: '#3E2522', // 1
                    950: '#2b1816'
                },
                accent: {
                    50: '#fffbf7',
                    100: '#FFF2DF',
                    200: '#f5e3ce',
                    300: '#FFE0B2',
                    400: '#f3c481',
                    500: '#D3A376',
                    600: '#b38257',
                    700: '#8f6542',
                    800: '#69482d',
                    900: '#452e1c'
                },
                gray: {
                    50: '#fffcf9',
                    100: '#FFF2DF',
                    200: '#FFE0B2',
                    300: '#e5c4a7', // Interpolated
                    400: '#D3A376',
                    500: '#b08a79', // Interpolated
                    600: '#8C6E63',
                    700: '#6b5148', // Interpolated
                    800: '#503831', // Interpolated
                    900: '#3E2522',
                },
                slate: {
                    50: '#fffcf9',
                    100: '#FFF2DF',
                    200: '#FFE0B2',
                    300: '#e5c4a7',
                    400: '#D3A376',
                    500: '#b08a79',
                    600: '#8C6E63',
                    700: '#6b5148',
                    800: '#503831',
                    900: '#3E2522',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
