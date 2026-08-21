import { expect, test, type Locator, type Page } from '@playwright/test';

const email = process.env.WEB_QA_EMAIL ?? '';
const password = process.env.WEB_QA_PASSWORD ?? '';
const expectAsyncPhotoCleanup = process.env.WEB_QA_EXPECT_ASYNC_PHOTO_CLEANUP === '1';

test.use({
  permissions: ['geolocation'],
  geolocation: { latitude: 35.994, longitude: -78.8986 },
});

async function advanceToReview(page: Page | Locator, chooseValues: boolean) {
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  if (chooseValues) {
    const onePixelPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
      'base64',
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: 'litterbugs-web-qa.png',
      mimeType: 'image/png',
      buffer: onePixelPng,
    });
    await expect(page.getByAltText('Selected report photo 1')).toBeVisible();
  } else {
    await expect(page.getByAltText('Existing report photo 1')).toBeVisible();
  }
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  if (chooseValues) await page.getByRole('button', { name: 'Bottles', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  if (chooseValues) await page.getByRole('button', { name: /Medium/ }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  if (chooseValues) await page.getByRole('button', { name: 'Scattered', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 6 of 6')).toBeVisible();
}

test('confirmed email user creates, edits, deletes, and signs out cleanly', async ({ page }, testInfo) => {
  test.skip(!email || !password, 'Disposable hosted QA credentials are required.');
  const reportTitle = `Web QA ${testInfo.project.name} ${Date.now()}`;
  const editedTitle = `${reportTitle} edited`;

  await page.goto('/?qa=hosted-account-flow', { waitUntil: 'domcontentloaded' });
  const signInButton = page.getByRole('button', { name: 'Sign in', exact: true });
  const authDialog = page.getByRole('dialog', { name: 'Sign in to Litterbugs' });
  await signInButton.click();
  if (!await authDialog.isVisible()) {
    await page.waitForTimeout(250);
    await signInButton.click();
  }
  await expect(authDialog).toBeVisible();
  await authDialog.getByLabel('Email address').fill(email);
  await authDialog.locator('input[type="password"]').fill(password);
  await authDialog.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Account', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Center map on your location', exact: true }).click();
  await page.waitForTimeout(500);
  const map = page.getByLabel('Litterbugs report map');
  const box = await map.boundingBox();
  expect(box).not.toBeNull();
  await map.click({ position: { x: Math.round(box!.width / 2), y: Math.round(box!.height / 2) } });

  const createDialog = page.getByRole('dialog', { name: 'Create litter report' });
  await expect(createDialog).toBeVisible();
  await createDialog.getByLabel('Report title').fill(reportTitle);
  await advanceToReview(createDialog, true);
  await createDialog.getByRole('button', { name: 'Submit report', exact: true }).click();
  await expect(createDialog).toBeHidden();
  await expect(page.getByText('Report saved. Thanks for helping keep the community clean!')).toBeVisible();

  const marker = page.locator(`gmp-advanced-marker[title="${reportTitle}"]`);
  await expect(marker).toHaveCount(1);
  const photoSignRequestPromise = page.waitForRequest((request) =>
    request.method() === 'POST' &&
    request.url().includes('/storage/v1/object/sign/report_photos/'),
  );
  await marker.evaluate((element) => (element as HTMLElement).click());
  const photoSignRequest = await photoSignRequestPromise;
  const photoSignHeaders = await photoSignRequest.allHeaders();
  const photoSignUrl = photoSignRequest.url();
  const detail = page.locator('.report-detail');
  await expect(detail.getByRole('heading', { name: reportTitle, exact: true })).toBeVisible();
  const detailPhoto = detail.locator('img.report-photo');
  await expect(detailPhoto).toBeVisible();
  await expect(detailPhoto).toHaveAttribute(
    'src',
    /\/storage\/v1\/object\/sign\/report_photos\//,
  );
  await detail.getByRole('button', { name: 'Edit', exact: true }).click();

  const editDialog = page.getByRole('dialog', { name: 'Edit litter report' });
  await editDialog.getByLabel('Report title').fill(editedTitle);
  await advanceToReview(editDialog, false);
  await editDialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(detail.getByRole('heading', { name: editedTitle, exact: true })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await detail.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(detail).toBeHidden();
  await expect(page.getByText('Report deleted.')).toBeVisible();
  if (expectAsyncPhotoCleanup) {
    await expect.poll(async () => {
      const response = await page.request.post(photoSignUrl, {
        data: { expiresIn: 60 },
        headers: {
          apikey: photoSignHeaders.apikey,
          authorization: photoSignHeaders.authorization,
        },
      });
      return [400, 404].includes(response.status());
    }, {
      message: 'the deleted report photo to be removed asynchronously',
      timeout: 30_000,
    }).toBe(true);
  }

  await page.getByRole('button', { name: 'Account', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('dialog', { name: 'Your Litterbugs account' })
    .getByRole('button', { name: 'Sign out', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
});
