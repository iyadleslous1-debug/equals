module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV ?? 'development');
  // Jest uses babel-jest with this same config. The NativeWind transform is
  // only needed for bundling the app — unit tests cover pure TS modules, so
  // skip it under `test` (it also avoids a babel-core/nativewind version skew
  // inside the jest sandbox). babel-jest sets NODE_ENV=test automatically.
  // NOTE: `nativewind/babel` returns `{ plugins: [...] }`, i.e. it is shaped
  // like a PRESET and must sit in `presets` — placing it in `plugins` throws
  // ".plugins is not a valid Plugin property" on modern @babel/core.
  const isTest = (process.env.NODE_ENV ?? '') === 'test';
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      ...(isTest ? [] : ['nativewind/babel']),
    ],
    plugins: [],
  };
};
