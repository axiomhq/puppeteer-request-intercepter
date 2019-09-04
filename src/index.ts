import fs from 'fs-extra';
import path from 'path';
import puppeteer, { Page } from 'puppeteer';

export interface FixtureRouterOptions {
  baseUrl?: string;
  fixtureBasePath?: string;
}

export interface FixtureRouteOptions {
  contentType?: string;
  status?: number;
}

export interface FixtureRoute {
  method: puppeteer.HttpMethod;
  route: string;
  fixturePath: string;
  options: FixtureRouteOptions;
}

export class FixtureRouter {
  public baseUrl: string | undefined;
  public fixtureRoutes: FixtureRoute[] = [];

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl;
  }

  public routeFixture(fixtureRoute: FixtureRoute): void {
    this.fixtureRoutes.push(fixtureRoute);
  }

  public route(
    method: puppeteer.HttpMethod,
    route: string,
    fixturePath: string,
    options: FixtureRouteOptions = {}
  ): void {
    this.routeFixture(createFixture(method, route, fixturePath, options));
  }

  public findRoute(method: puppeteer.HttpMethod, url: string): FixtureRoute | undefined {
    return this.fixtureRoutes.find((fixture) => {
      const route = fixture.route.startsWith('http') ? fixture.route : `${this.baseUrl || ''}${fixture.route}`;

      return method === fixture.method && url.startsWith(route);
    });
  }
}

export async function initFixtureRouter(page: Page, options: FixtureRouterOptions = {}): Promise<FixtureRouter> {
  await page.setRequestInterception(true);

  const fixtureRouter = new FixtureRouter(options.baseUrl);

  const fixturePath = options.fixtureBasePath || path.join(process.cwd(), 'puppeteer/fixtures');

  page.on('request', async (request) => {
    const fixtureRoute = fixtureRouter.findRoute(request.method(), request.url());

    if (fixtureRoute) {
      // check if the fixture exists
      const filePath = path.join(fixturePath, fixtureRoute.fixturePath);
      const exists = await fs.pathExists(filePath);
      if (exists) {
        // tslint:disable-next-line: non-literal-fs-path
        const body = await fs.readFile(filePath);

        console.log('Routing Fixture:', fixtureRoute.route, '=', request.url(), '=>', filePath);

        return request.respond({
          body: body,
          contentType: fixtureRoute.options.contentType || 'application/json',
          status: fixtureRoute.options.status,
        });
      } else {
        // continue the request (we'll save it in the response event).
        await request.continue();
      }
    } else {
      return request.continue();
    }
  });

  page.on('response', async (response) => {
    const request = response.request();
    const fixtureRoute = fixtureRouter.findRoute(request.method(), request.url());
    if (fixtureRoute) {
      // save fixture if it doesn't exist
      const filePath = path.join(fixturePath, fixtureRoute.fixturePath);
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        console.log('Creating new fixture file:', filePath, fixtureRoute.route, request.url());

        // tslint:disable-next-line: non-literal-fs-path
        fs.writeFile(filePath, await response.buffer());

        return;
      }
    }
  });

  return fixtureRouter;
}

export function createFixture(
  method: puppeteer.HttpMethod,
  route: string,
  fixturePath: string,
  options: FixtureRouteOptions = {}
): FixtureRoute {
  return {
    fixturePath: fixturePath,
    method: method,
    options: options,
    route: route,
  };
}
