// Usage: npx expo start --web --port 8098, then: node scripts/e2e-web.mjs http://localhost:8098 <screenshot-dir> [dark|light]
// Needs playwright-core and Microsoft Edge, or E2E_CHANNEL=chrome.
// End-to-end smoke of the primary journey on the web build, in a phone-sized Edge window:
// Welcome -> Onboarding -> Home -> Discover -> choose hobby -> complete activity -> Progress updated.
import { chromium } from 'playwright-core';

const [, , url, shots, scheme = 'dark'] = process.argv;
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
await page.clock.install();

const btn = (name) => page.getByRole('button', { name, exact: true }).first();
const shot = (n) => page.screenshot({ path: `${shots}/${scheme}-${n}.png` });
const step = async (label, fn) => {
  try {
    await fn();
    console.log(`ok   ${label}`);
  } catch (e) {
    console.log(`FAIL ${label}: ${e.message.split('\n')[0]}`);
    await shot('fail');
    throw e;
  }
};

try {
  await step('welcome renders', async () => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180_000 });
    await btn('Get started').waitFor({ timeout: 180_000 });
    await shot('1-welcome');
  });
  await step('onboarding', async () => {
    await btn('Get started').click();
    await page.getByLabel('Name').first().fill('Priya');
    await btn('Continue').click();
    await page.getByRole('checkbox', { name: 'Making things' }).click();
    await page.getByRole('checkbox', { name: 'Words' }).click();
    await shot('2-onboarding');
    for (let i = 0; i < 5; i++) await btn('Continue').click();
    await page.getByRole('radio', { name: '3 hours' }).click();
    await btn('Continue').click();
    await btn('Done').click();
  });
  await step('home shows greeting and featured hobby', async () => {
    await page.getByText('Priya', { exact: false }).first().waitFor();
    await btn('Start 15 minutes').waitFor();
    await shot('3-home');
  });
  await step('discover shows three suggestions', async () => {
    await page.getByRole('tab', { name: 'Discover' }).click();
    await page.getByText('Why it fits').first().waitFor();
    const count = await page.getByText('Why it fits').count();
    if (count < 3) throw new Error(`only ${count} suggestions`);
    await shot('4-discover');
  });
  await step('choose a hobby and run the timer', async () => {
    await btn('Start 15 minutes').click();
    await btn('Start').waitFor();
    await btn('Start').click();
    await page.clock.fastForward('02:05');
    await btn('Pause').waitFor();
    await shot('5-timer');
  });
  await step('complete and save the session', async () => {
    await btn('I did it').click();
    await page.getByLabel('Reflection (optional)').first().fill('Calmer than scrolling.');
    await btn('Save session').click();
    await page.getByText('Saved.').waitFor();
    await shot('6-saved');
  });
  await step('progress reflects the session', async () => {
    await btn('See progress').click();
    await page.getByText('Recent sessions').waitFor();
    await page.getByText('“Calmer than scrolling.”').waitFor();
    await shot('7-progress');
  });
} finally {
  console.log(errors.length ? `errors:\n${[...new Set(errors)].slice(0, 15).join('\n')}` : 'no runtime errors');
  await browser.close();
}
// Uncaught exceptions fail the run; React dev warnings are reported but tolerated.
if (errors.some((e) => e.startsWith('pageerror'))) process.exit(1);
