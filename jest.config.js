module.exports = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: ['<rootDir>/test/*.test.[jt]s'],
}
