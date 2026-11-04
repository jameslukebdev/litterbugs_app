// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MonthlySupport } from './monthly-support';

afterEach(cleanup);
const options = [5, 10, 25].map(amount => ({ amount, url: `https://buy.stripe.com/amount${amount}` }));
const portalUrl = 'https://billing.stripe.com/p/login/support';
it('keeps the selected amount, recurring label and checkout destination consistent', () => {
  const view = render(<MonthlySupport options={options} portalUrl={portalUrl} />);
  expect(view.getByRole('link', { name: 'Support with $5 / month' }).getAttribute('href')).toBe(options[0].url);
  fireEvent.click(view.getByRole('radio', { name: '$25 / month' }));
  expect(view.getByRole('link', { name: 'Support with $25 / month' }).getAttribute('href')).toBe(options[2].url);
  expect(view.getByRole('link', { name: 'Manage or cancel your support' }).getAttribute('href')).toBe(portalUrl);
});
it('does not offer checkout without a cancellation portal', () => {
  const view = render(<MonthlySupport options={options} portalUrl="" />);
  expect(view.queryByRole('link', { name: /Support with/ })).toBeNull();
  expect(view.getByRole('status').textContent).toContain('available soon');
});

it('emits checkout intent with the chosen amount and no payment-completed claim', () => {
  const listener = vi.fn(); window.addEventListener('litterbugs:analytics-event', listener);
  const view = render(<MonthlySupport options={options} portalUrl={portalUrl} />);
  fireEvent.click(view.getByRole('radio', {name:'$10 / month'}));
  const link = view.getByRole('link', {name:'Support with $10 / month'});
  link.addEventListener('click', e => e.preventDefault()); fireEvent.click(link);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0][0].detail).toEqual({event:'support_checkout_clicked',amount:10,currency:'USD',billing_interval:'month'});
  window.removeEventListener('litterbugs:analytics-event', listener);
});
