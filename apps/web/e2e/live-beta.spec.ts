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
  await expect(page.locator('.report-detail')).toBeVisible();
  await page.locator('.report-detail').getByRole('button', { name: 'Close report details' }).click();

  const heicReportMarker = page.locator('gmp-advanced-marker[title="High example"]');
  await expect(heicReportMarker).toHaveCount(1);
  await heicReportMarker.evaluate((marker) => (marker as HTMLElement).click());
  const heicReportDetail = page.locator('.report-detail');
  await expect(heicReportDetail.getByRole('heading', { name: 'High example', exact: true })).toBeVisible();
  for (let photoIndex = 1; photoIndex <= 3; photoIndex += 1) {
    const photo = heicReportDetail.getByAltText(`Report photo ${photoIndex} of 3`);
    await expect(photo).toHaveAttribute('src', /\/api\/report-photo\?path=/);
    await expect.poll(() => photo.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    if (photoIndex < 3) await heicReportDetail.getByRole('button', { name: 'Next photo' }).click();
  }
  await heicReportDetail.getByRole('button', { name: 'Close report details' }).click();

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
