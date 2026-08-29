import { expect, test } from '@playwright/test';

test('public map, report detail, controls, and signed-out boundaries work', async ({ page }) => {
  const relevantRuntimeErrors: string[] = [];
  page.on('pageerror', (error) => relevantRuntimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') relevantRuntimeErrors.push(message.text());
  });

  await page.goto('/?qa=playwright-cross-browser', { waitUntil: 'domcontentloaded' });

  await expect(page.getByLabel('Litterbugs report map')).toBeVisible();
  await expect.poll(() => page.locator('.report-map-marker').count()).toBeGreaterThan(0);
  await expect(page.getByText(/Google Maps could not load/i)).toHaveCount(0);

  const zoomOut = page.getByRole('button', { name: 'Zoom out' });
  for (let index = 0; index < 7; index += 1) await zoomOut.click();

  await page.locator('gmp-advanced-marker').first().evaluate((marker) =>
    (marker as HTMLElement).click(),
  );
  const reportDetail = page.locator('.report-detail');
  await expect(reportDetail).toBeVisible();
  const reportPhoto = reportDetail.locator('img.report-photo').first();
  await expect(reportPhoto).toHaveAttribute('src', /\/api\/report-photo\?path=/);
  await expect.poll(() => reportPhoto.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await reportDetail.getByRole('button', { name: 'Back to search' }).click();

  const mapType = page.getByRole('button', { name: /Change map type/ });
  await mapType.click();
  await expect(mapType).toHaveAccessibleName(/Current: satellite/i);

  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Sign in to Litterbugs' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Continue with Facebook/i })).toBeVisible();
  await expect(dialog.getByLabel('Email address')).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Apple/i })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: /Guest/i })).toHaveCount(0);

  expect(relevantRuntimeErrors).toEqual([]);
});
