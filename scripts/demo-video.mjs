// Records a ~1-minute walkthrough of the real app in a phone-sized browser, plus screenshots.
// Usage: npx expo start --web --port 8098, then: node scripts/demo-video.mjs http://localhost:8098 <out-dir>
import { chromium } from 'playwright-core';

const [, , url, out] = process.argv;
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge' });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  recordVideo: { dir: out, size: { width: 780, height: 1688 } },
});
const page = await context.newPage();
await page.clock.install();
await page.clock.resume();

const btn = (name) => page.getByRole('button', { name, exact: true }).first();
const pause = (ms = 1400) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const scroll = async (y) => {
  await page.mouse.move(195, 500);
  await page.mouse.wheel(0, y);
  await pause(900);
};

await page.goto(url, { waitUntil: 'domcontentloaded' });
await btn('Get started').waitFor({ timeout: 120_000 });
await pause(2500);
await shot('01-welcome');

await btn('Get started').click();
await pause(700);
await page.getByLabel('Name').first().pressSequentially('Priya', { delay: 90 });
await pause(500);
await btn('Continue').click();
for (const i of ['Making things', 'Music', 'Words']) {
  await page.getByRole('checkbox', { name: i }).click();
  await pause(350);
}
await shot('02-onboarding');
await pause(600);
for (let i = 0; i < 5; i++) {
  await btn('Continue').click();
  await pause(550);
}
await page.getByRole('radio', { name: '3 hours' }).click();
await pause(500);
await btn('Continue').click();
await page.getByRole('checkbox', { name: 'Late night' }).click();
await pause(500);
await btn('Done').click();

await page.getByText('Priya').first().waitFor();
await pause(2200);
await shot('03-home');

await page.getByRole('tab', { name: 'Discover' }).click();
await page.getByText('Why it fits').first().waitFor();
await pause(1800);
await shot('04-discover');
await scroll(500);
await scroll(500);
await btn('Start 15 minutes').click();

await btn('Start').waitFor();
await pause(1200);
await btn('Start').click();
await pause(2500);
await page.clock.fastForward('06:00');
await pause(1500);
await shot('05-timer');
await page.getByRole('checkbox').first().click();
await pause(500);
await page.getByRole('checkbox').nth(1).click();
await pause(800);
await btn('I did it').click();
await pause(700);
await page.getByLabel('Reflection (optional)').first().pressSequentially('Calmer than scrolling. Want to do this again tomorrow.', { delay: 35 });
await pause(600);
await btn('Save session').click();
await page.getByText('Saved.').waitFor();
await pause(2000);
await shot('06-saved');

await btn('See progress').click();
await page.getByText('Recent sessions').waitFor();
await pause(1800);
await shot('07-progress');
await scroll(600);
await scroll(600);

await page.getByRole('tab', { name: 'Arena' }).click();
await pause(1800);
await shot('08-arena');
await scroll(700);
await pause(800);

await page.getByRole('tab', { name: 'Home' }).click();
await pause(1500);
await btn('Profile and settings').click();
await pause(1500);
await shot('09-settings');
await page.getByRole('radio', { name: 'Light' }).click();
await pause(1800);
await shot('10-settings-light');
await page.getByRole('radio', { name: 'Dark' }).click();
await pause(1500);

await context.close();
await browser.close();
console.log('recorded');
