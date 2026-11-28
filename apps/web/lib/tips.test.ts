import { expect, it } from 'vitest';
import { parseTipAmount, tipFeeCents } from './tips';

it('adds a 50¢ + 5% service fee on top, matching the backend and database check', () => {
  expect(tipFeeCents(500)).toBe(75);
  expect(tipFeeCents(1000)).toBe(100);
  expect(tipFeeCents(300)).toBe(65);
  expect(tipFeeCents(2000)).toBe(150);
});

it('accepts $3 to $1,000 in dollars or dollars and cents', () => {
  expect(parseTipAmount('5')).toBe(500);
  expect(parseTipAmount('$12.50')).toBe(1250);
  expect(parseTipAmount('3')).toBe(300);
  expect(parseTipAmount('1000')).toBe(100_000);
  for (const bad of ['2.99', '1000.01', 'abc', '5.555', '', '-5']) expect(parseTipAmount(bad)).toBeNull();
});
