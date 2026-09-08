module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV ?? 'development');
  // Jest uses babel-jest with this same config. The NativeWind transform is
  // only needed for bundling the app — unit tests cover pure TS modules, so
  // skip it under `test` (it also avoids a babel-core/nativewind version skew
  // inside the jest sandbox). babel-jest sets NODE_ENV=test automatically.
  const isTest = (process.env.NODE_ENV ?? '') === 'test';
  return {
    presets: ['babel-preset-expo'],
    plugins: isTest ? [] : ['nativewind/babel'],
  };
};
