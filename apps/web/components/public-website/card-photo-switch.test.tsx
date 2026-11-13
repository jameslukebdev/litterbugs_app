// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element -- DOM slides exercise actual image loading attributes. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { CardPhotoSwitch } from './card-photo-switch';
afterEach(cleanup);
function setup() {
  return render(<article className="report-card-container">
    {[0, 1, 2, 3].map(n => <span className="card-slide" key={n} data-active={n === 0 || undefined}><img src={`/photo-${n}.jpg`} alt={`Photo ${n}`} loading="lazy" /></span>)}
    <span className="report-result-dots">{[0, 1, 2, 3].map(n => <i key={n} />)}</span>
    <CardPhotoSwitch count={4} title="Park litter" />
  </article>);
}
it.each(['pointerDown', 'focusIn', 'pointerEnter'] as const)('warms both neighboring photos on %s without changing the selected photo', event => {
  const view = setup();
  fireEvent[event](view.container.querySelector('article')!);
  expect((screen.getByAltText('Photo 1') as HTMLImageElement).loading).toBe('eager');
  expect((screen.getByAltText('Photo 3') as HTMLImageElement).loading).toBe('eager');
  expect(screen.getByAltText('Photo 2').getAttribute('loading')).toBe('lazy');
  expect(screen.getByAltText('Photo 0').parentElement?.hasAttribute('data-active')).toBe(true);
});
it('prioritizes the selected image on a direct click and keeps rapid steps in order', () => {
  setup();
  const next = screen.getByRole('button', { name: 'Next photo of Park litter' });
  fireEvent.click(next);
  expect((screen.getByAltText('Photo 1') as HTMLImageElement).loading).toBe('eager');
  fireEvent.click(next);
  expect(screen.getByAltText('Photo 2').parentElement?.hasAttribute('data-active')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Previous photo of Park litter' }));
  expect(screen.getByAltText('Photo 1').parentElement?.hasAttribute('data-active')).toBe(true);
});
