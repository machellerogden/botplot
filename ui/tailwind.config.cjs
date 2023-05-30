/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './index.html',
        './src/**/*.{js,svelte}',
    ],
    theme: {
        extend: {
            colors: {
                white: 'rgb(var(--white-color))',
                black: 'rgb(var(--black-color))',
                primary: {
                    DEFAULT: 'rgb(var(--primary-color))',
                    50: 'rgb(var(--primary-color-50))',
                    100: 'rgb(var(--primary-color-100))',
                    200: 'rgb(var(--primary-color-200))',
                    300: 'rgb(var(--primary-color-300))',
                    400: 'rgb(var(--primary-color-400))',
                    500: 'rgb(var(--primary-color-500))',
                    600: 'rgb(var(--primary-color-600))',
                    700: 'rgb(var(--primary-color-700))',
                    800: 'rgb(var(--primary-color-800))',
                    900: 'rgb(var(--primary-color-900))'
                },
                secondary: {
                    DEFAULT: 'rgb(var(--secondary-color))',
                    '50': 'rgb(var(--secondary-color-50))',
                    '100': 'rgb(var(--secondary-color-100))',
                    '200': 'rgb(var(--secondary-color-200))',
                    '300': 'rgb(var(--secondary-color-300))',
                    '400': 'rgb(var(--secondary-color-400))',
                    '500': 'rgb(var(--secondary-color-500))',
                    '600': 'rgb(var(--secondary-color-600))',
                    '700': 'rgb(var(--secondary-color-700))',
                    '800': 'rgb(var(--secondary-color-800))',
                    '900': 'rgb(var(--secondary-color-900))'
                },
                gray: {
                    DEFAULT: 'rgb(var(--gray-color))',
                    100: 'rgb(var(--gray-color-100))',
                    200: 'rgb(var(--gray-color-200))',
                    300: 'rgb(var(--gray-color-300))',
                    400: 'rgb(var(--gray-color-400))',
                    500: 'rgb(var(--gray-color-500))',
                    600: 'rgb(var(--gray-color-600))',
                    700: 'rgb(var(--gray-color-700))',
                    800: 'rgb(var(--gray-color-800))',
                    900: 'rgb(var(--gray-color-900))'
                },
                info: {
                    DEFAULT: 'rgb(var(--info-color))',
                    100: 'rgb(var(--info-color-100))',
                    200: 'rgb(var(--info-color-200))',
                    300: 'rgb(var(--info-color-300))',
                    400: 'rgb(var(--info-color-400))',
                    500: 'rgb(var(--info-color-500))',
                    600: 'rgb(var(--info-color-600))',
                    700: 'rgb(var(--info-color-700))',
                    800: 'rgb(var(--info-color-800))',
                    900: 'rgb(var(--info-color-900))'
                },
                success: {
                    DEFAULT: 'rgb(var(--success-color))',
                    100: 'rgb(var(--success-color-100))',
                    200: 'rgb(var(--success-color-200))',
                    300: 'rgb(var(--success-color-300))',
                    400: 'rgb(var(--success-color-400))',
                    500: 'rgb(var(--success-color-500))',
                    600: 'rgb(var(--success-color-600))',
                    700: 'rgb(var(--success-color-700))',
                    800: 'rgb(var(--success-color-800))',
                    900: 'rgb(var(--success-color-900))'
                },
                warning: {
                    DEFAULT: 'rgb(var(--warning-color))',
                    100: 'rgb(var(--warning-color-100))',
                    200: 'rgb(var(--warning-color-200))',
                    300: 'rgb(var(--warning-color-300))',
                    400: 'rgb(var(--warning-color-400))',
                    500: 'rgb(var(--warning-color-500))',
                    600: 'rgb(var(--warning-color-600))',
                    700: 'rgb(var(--warning-color-700))',
                    800: 'rgb(var(--warning-color-800))',
                    900: 'rgb(var(--warning-color-900))'
                },
                danger: {
                    DEFAULT: 'rgb(var(--danger-color))',
                    100: 'rgb(var(--danger-color-100))',
                    200: 'rgb(var(--danger-color-200))',
                    300: 'rgb(var(--danger-color-300))',
                    400: 'rgb(var(--danger-color-400))',
                    500: 'rgb(var(--danger-color-500))',
                    600: 'rgb(var(--danger-color-600))',
                    700: 'rgb(var(--danger-color-700))',
                    800: 'rgb(var(--danger-color-800))',
                    900: 'rgb(var(--danger-color-900))'
                }
            },
            fontFamily: {
                'sans': [ 'Roboto', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif' ],
                'serif': [ 'PT Serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif' ],
                'mono': [ 'Fira Code', 'Monaco', 'monospace' ],
                'display': [ 'Roboto', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif' ],
                'body': [ 'Roboto', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif' ]
            },
            fontSize: {
                'tiny': '0.5rem',
                'xxs': '.625rem',
                'xs': '.75rem',
                'sm': '.875rem',
                'base': '1rem',
                'lg': '1.125rem',
                'xl': '1.25rem',
                'xxl': '1.5rem',
                '3xl': '1.875rem',
                '4xl': '2rem'
            }
        }
    },
    plugins: []
};
