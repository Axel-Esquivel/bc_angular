import { ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core';

import { APP_CONFIG, APP_CONFIG_VALUE, AppConfig } from './config/app-config';

@NgModule({
  providers: [],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule?: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule has already been loaded. Import CoreModule in the AppModule only.');
    }
  }

  static forRoot(config: AppConfig = APP_CONFIG_VALUE): ModuleWithProviders<CoreModule> {
    return {
      ngModule: CoreModule,
      providers: [{ provide: APP_CONFIG, useValue: config }],
    };
  }
}
