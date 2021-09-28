module.exports = {
    root: true,
    env: {
        node: true
    },
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint'
    ],
    rules: {
        '@typescript-eslint/semi': ['error', 'never'],
        '@typescript-eslint/space-before-function-paren': ['error', 'never'],
        '@typescript-eslint/member-delimiter-style': 'error',
        '@typescript-eslint/type-annotation-spacing': 'error',
        '@typescript-eslint/comma-dangle': 'error',
        '@typescript-eslint/comma-spacing': 'error',
        '@typescript-eslint/indent': 'error',
        '@typescript-eslint/keyword-spacing': 'error',
        '@typescript-eslint/no-extra-parens': 'error',
        '@typescript-eslint/no-shadow': 'error',
        '@typescript-eslint/no-use-before-define': 'error',
        '@typescript-eslint/object-curly-spacing': ['error', 'always'],
        '@typescript-eslint/padding-line-between-statements': 'error',
        '@typescript-eslint/quotes': ['error', 'single']
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ]
}
