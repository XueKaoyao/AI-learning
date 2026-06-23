// Extends Jest matchers with @testing-library/jest-dom
// (toBeInTheDocument, toHaveTextContent, toBeVisible, etc.)
import '@testing-library/jest-dom';

// fake-indexeddb polyfills the global indexedDB API for Node/jsdom test
// environments. Must be imported before any IndexedDB code runs.
import 'fake-indexeddb/auto';

// fake-indexeddb v6 uses structuredClone internally, which may not be
// available in jsdom even on Node 17+. Polyfill using Node's v8 module
// which correctly handles Map, Set, Date, etc. (unlike JSON round-trip).
import { serialize, deserialize } from 'v8';
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: unknown) => deserialize(serialize(obj));
}

// =============================================================================
// Browser API Mocks
// =============================================================================

// Mock window.matchMedia — used by Ant Design for theme and breakpoint
// detection. Returns a stub MediaQueryList that reports no matches.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver — used by Ant Design for lazy loading and
// visibility detection. Stub all methods as no-ops.
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock scrollIntoView — used by SystemPromptItems for scrolling new
// prompt cards into view. No-op in test environment.
Element.prototype.scrollIntoView = jest.fn();

// Mock URL.createObjectURL / revokeObjectURL — used by useHandleFiles
// for export (creating downloadable blob URLs).
if (typeof URL.createObjectURL === 'undefined') {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: jest.fn(() => 'blob:mock-url'),
  });
}
if (typeof URL.revokeObjectURL === 'undefined') {
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: jest.fn(),
  });
}
