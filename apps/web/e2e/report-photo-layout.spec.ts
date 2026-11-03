import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const sizes = [
  [320, 740], [390, 844], [600, 900], [700, 850], [701, 850],
  [740, 390], [760, 850], [774, 850], [819, 850], [820, 850],
  [821, 850], [900, 900], [1099, 900], [1100, 900], [1440, 1000],
];

// Use the real stylesheet and report DOM structure, without depending on live
// report data, signed image URLs, or authentication. This catches layout bugs
// that jsdom cannot measure, especially either side of responsive breakpoints.
for (const [width, height] of sizes) {
  for (const mode of ['context', 'expanded']) {
    for (const state of ['completed', 'active', 'no-photo']) {
      test(`${mode} ${state}: photos stay within their section at ${width}x${height}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const completed = state === 'completed';
        await page.setContent(`<!doctype html><html><head><style>${css}
          .report-detail { animation: none !important; }
        </style></head><body>
          <div class="report-detail-backdrop ${mode === 'context' ? 'report-detail-context' : 'report-detail-expanded'}">
            <aside class="report-detail ${state === 'no-photo' ? 'report-detail-without-photo' : ''}" role="dialog" aria-label="Report">
              <header class="report-detail-toolbar"><button>Back</button><span>Report actions</span></header>
              <div class="report-detail-layout">
                <header class="report-detail-header"><h2>A report with a title that wraps across multiple lines</h2><p>Medium · Cleanup ${completed ? 'complete' : 'available'}</p></header>
                <div class="report-detail-visual">
                  ${completed ? '<p class="report-photo-label">Before cleanup</p>' : ''}
                  <div class="report-photo-region">${state === 'no-photo' ? '<div class="photo-placeholder">No photo added</div>' : '<img class="report-photo" alt="Before" />'}</div>
                </div>
                <div class="report-detail-panel"><div class="report-detail-scroll">
                  ${completed ? '<section class="completed-cleanup-story"><h3>Cleanup complete</h3><h4>After cleanup</h4><div class="cleanup-after-photos"><img alt="After" /></div><p>' + 'Cleanup evidence and community activity. '.repeat(30) + '</p></section>' : ''}
                  <div class="report-detail-body"><p>${'Original report notes. '.repeat(30)}</p></div>
                </div><footer class="report-detail-footer"><button>Report action</button></footer></div>
              </div>
            </aside>
          </div>
        </body></html>`);
        const measurements = await page.evaluate(() => {
          const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
          const photo = box('.report-photo-region');
          const visual = box('.report-detail-visual');
          const story = document.querySelector('.completed-cleanup-story')?.getBoundingClientRect();
          const intersectsStory = !!story && photo.left < story.right && photo.right > story.left && photo.top < story.bottom && photo.bottom > story.top;
          return { photoHeight: photo.height, photoBottom: photo.bottom, visualBottom: visual.bottom, intersectsStory, overflow: document.documentElement.scrollWidth > innerWidth };
        });
        expect(measurements.photoHeight).toBeGreaterThan(80);
        expect(measurements.photoBottom).toBeLessThanOrEqual(measurements.visualBottom + 1);
        expect(measurements.intersectsStory).toBe(false);
        expect(measurements.overflow).toBe(false);
        const scroller = page.locator('.report-detail-layout');
        await scroller.evaluate(element => { element.scrollTop = element.scrollHeight; });
        const photoStillContained = await page.evaluate(() => document.querySelector('.report-photo-region')!.getBoundingClientRect().bottom <= document.querySelector('.report-detail-visual')!.getBoundingClientRect().bottom + 1);
        expect(photoStillContained).toBe(true);
      });
    }
  }
}
