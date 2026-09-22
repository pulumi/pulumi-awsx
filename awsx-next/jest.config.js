module.exports = {
  modulePathIgnorePatterns: ['/bin/'],
  testPathIgnorePatterns: ['/node_modules/', '/bin/'],
  coverageProvider: 'v8',
  coverageReporters: ['text', 'lcov'],
  restoreMocks: true,
};
