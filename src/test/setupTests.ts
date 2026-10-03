// jsdom does not implement ResizeObserver, but Headless UI's <Menu> uses it
// internally to detect pointer movement for hover/focus handling. Without this
// polyfill, any test that opens a Menu (e.g. UserSwitcher) throws
// "ReferenceError: ResizeObserver is not defined".
class ResizeObserverPolyfill {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}
