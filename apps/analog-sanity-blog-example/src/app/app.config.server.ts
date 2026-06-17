import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import {
  provideServerRendering,
  ɵSERVER_CONTEXT as SERVER_CONTEXT,
} from '@angular/platform-server';

import { appServerConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    { provide: SERVER_CONTEXT, useValue: 'ssr-analog' },
  ],
};

export const config = mergeApplicationConfig(appServerConfig, serverConfig);
