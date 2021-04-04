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
        '@typescript-eslint/semi': ['error', 'never'],
        'quotes': ['error', 'single'],
        'indent': ['error', 4],
        'object-curly-spacing': ['error', 'always']
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ]
};