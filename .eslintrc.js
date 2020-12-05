module.exports = {
    root: true,
    env: {
        node: true
    },
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    rules: {
        '@typescript-eslint/semi': 'error',
        'quotes': ['error', 'single']
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ]
};