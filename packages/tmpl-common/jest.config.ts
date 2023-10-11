/* eslint-disable */
export default {
    displayName: 'tmpl-common',
    preset: '../../jest.preset.js',
    testEnvironment: 'node',
    transform: {
        '^.+\.[tj]s$': [
            'ts-jest',
            { tsconfig: '<rootDir>/tsconfig.spec.json' },
        ],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../coverage/packages/tmpl-common',
};
