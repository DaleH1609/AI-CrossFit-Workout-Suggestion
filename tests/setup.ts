import '@testing-library/jest-dom'

/**
 * jsdom implements neither of these, and Radix primitives (Popover, and so any
 * component built on it) construct a ResizeObserver on mount and call
 * scrollIntoView when moving focus. Without the shims a component test fails
 * inside the library rather than on anything it is asserting.
 *
 * Deliberately inert: measurement and scrolling are not what these tests are
 * checking, and a fake that returned plausible geometry would invite tests
 * that quietly depend on it.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}
