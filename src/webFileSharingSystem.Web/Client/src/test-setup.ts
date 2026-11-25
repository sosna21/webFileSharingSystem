const jsdomWindow = (
  globalThis as typeof globalThis & { jsdom: { window: Window } }
).jsdom.window;

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: jsdomWindow.localStorage,
});
