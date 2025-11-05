import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
// Polyfill for react-router / WHATWG APIs
// @ts-ignore
if (!(global as any).TextEncoder) (global as any).TextEncoder = TextEncoder as any;
// @ts-ignore
if (!(global as any).TextDecoder) (global as any).TextDecoder = TextDecoder as any;
