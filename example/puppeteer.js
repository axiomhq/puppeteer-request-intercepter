const puppeteer = require('puppeteer');

const { initFixtureRouter } = require('../build/main');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const fixtureRouter = await initFixtureRouter(page, { baseUrl: 'https://news.ycombinator.com' });
  fixtureRouter.route('GET', '/y18.gif', 'y18.gif', { contentType: 'image/gif' });

  await page.goto('https://news.ycombinator.com', { waitUntil: 'networkidle2' });
  await page.pdf({ path: 'hn.pdf', format: 'A4' });

  await browser.close();
})();
