# puppeteer-request-intercepter

Intercept API Requests and return Mocked Data

## Install

```
$ npm install puppeteer-request-intercepter
```


## Usage

```js

const puppeteer = require('puppeteer');

const { initFixtureRouter } = require('puppeteer-request-intercepter');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const fixtureRouter = await initFixtureRouter(page, { baseUrl: 'https://news.ycombinator.com' });
  fixtureRouter.route('GET', '/y18.gif', 'y18.gif', { contentType: 'image/gif' });

  await page.goto('https://news.ycombinator.com', { waitUntil: 'networkidle2' });
  await page.pdf({ path: 'hn.pdf', format: 'A4' });

  await browser.close();
})();

```

## API

### initFixtureRouter(page, options?)

Initialize a new FixtureRouter class.

This class is responsible for configuring and handling Puppeteer requests. Eg. `page.on('request')` and `page.on('response')`

Returns a FixtureRouter object with `route` and `routeFixture` functions.

#### page

Type: `object`

An instance of the Puppeteer `page` object.

#### options

Type: `object`<br>
Default: `{}`

Decode the keys and values. URL components are decoded with [`decode-uri-component`](https://github.com/SamVerschueren/decode-uri-component).

##### baseUrl

Type: `string`<br>
Default: `''`

Base Url for relative fixture routes (ex. `/api/v1/users`).

```js
const fixtureRouter = await initFixtureRouter(page, { baseUrl: 'https://news.ycombinator.com' });
```

##### fixtureBasePath

Type: `string`<br>
Default: `./puppeteer/fixtures`

Base path where the fixture files are located (and will be created if they don't exist).



### fixtureRouter.route(method, route, fixturePath, options)

Add a `FixtureRoute` to the `FixtureRouter` instance.

#### method

Type: `string`

The HttpMethod to match:
- GET
- POST
- PATCH
- PUT
- DELETE
- OPTIONS

#### route

Type: `string`

The full or relative Url to match.

Comparison is done using `startsWith()` and the order in which `FixtureRoute`'s are added matters. The first one found will be used.

Put the most specific match first. Ex:

```
fixtureRouter.route('GET', '/api/v1/users/bill', 'bill.json');
fixtureRouter.route('GET', '/api/v1/users', 'all-users.json');
```

#### fixturePath

Type: `string`

Relative path of the fixture file to use (or create).

#### options

Type: `object`<br>
Default: `{}`

`FixtureRouteOptions` to use for the response.

##### contentType

Type: `string`<br>
Default: `application/json`

Specifies the Content-Type response header.

##### status

Type: `number`<br>

Specifies the response status code.



### fixtureRouter.routeFixture(fixtureRoute)

Add a `FixtureRoute` to the `FixtureRouter` instance.

Options are the same as `fixtureRouter.route()` except it accepts an object of parameters instead of individual ones.



### fixtureRouter.findRoute(method, url)

Returns the first `FixtureRoute` that matches the provided `method` and `url`. If there are no matches it returns `undefined`.

#### method

Type: `string`

The HttpMethod to match.

#### url

Type: `string`

The full or relative Url to match.

If it's a relative Url, the configured `baseUrl` will be used.



### createFixture(method, route, fixturePath, options)

Convenience method for creating `FixtureRoute`'s.

Same API as `fixtureRouter.route`.

Useful when using `BackstopJS` with a custom `scenarios.fixtures` array.



## BackstopJS Example

##### onBefore.ts:

```TypeScript
import { Scenario } from 'backstopjs';
import { Page } from 'puppeteer';
import { initFixtureRouter } from 'puppeteer-request-intercepter';

// tslint:disable-next-line: export-name
export = async (page: Page, scenario: Scenario, vp) => {
  // Configure fixtures:
  if (scenario.fixtures) {
    const fixtureRouter = await initFixtureRouter(page, {
      baseUrl: `http://localhost:8080`,
      fixtureBasePath: 'backstop_data/engine_scripts/fixtures',
    });

    scenario.fixtures.forEach((fixture) => {
      fixtureRouter.routeFixture(fixture);
    });
  }
};
```

##### backstopConfig.ts:

```TypeScript

import { Config, Scenario } from 'backstopjs';
import { Page } from 'puppeteer';
import { createFixture, FixtureRoute } from 'puppeteer-request-intercepter';

const globalFixtures: FixtureRoute[] = [
  createFixture('GET', '/api/v1/alerts', 'alerts.json'),
];

const config: Config = {
  id: 'MyProject',
  viewports: [
    {
      label: 'phone',
      width: 320,
      height: 1200,
    },
    {
      label: 'tablet',
      width: 1024,
      height: 768,
    },
    {
      label: 'desktop',
      width: 1200,
      height: 900,
    },
  ],
  paths: {
    bitmaps_reference: 'backstop_data/bitmaps_reference',
    bitmaps_test: 'backstop_data/bitmaps_test',
    engine_scripts: 'backstop_data/dist/engine_scripts',
    html_report: 'backstop_data/html_report',
    ci_report: 'backstop_data/ci_report',
  },
  report: ['browser'],
  engine: 'puppeteer',
  engineOptions: {
    args: ['--no-sandbox'],
  },
  asyncCaptureLimit: 5,
  asyncCompareLimit: 50,
  debug: false,
  debugWindow: false,
  onBeforeScript: 'onBefore.js',
  onReadyScript: 'onReady.js',
  scenarios: [
    {
      label: 'dashboards',
      url: url('/dashboards'),
      fixtures: [
        ...globalFixtures,
        createFixture('GET', '/api/v1/dashboards', 'dashboards.json')
      ],
    },
  ],
};

export = config;

```
