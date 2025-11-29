import { ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core';

import { APP_CONFIG, AppConfig, DEFAULT_APP_CONFIG } from './config/app-config';

@NgModule({
  providers: [],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule?: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule has already been loaded. Import CoreModule in the AppModule only.');
    }
  }

  static forRoot(config: AppConfig = DEFAULT_APP_CONFIG): ModuleWithProviders<CoreModule> {
    return {
      ngModule: CoreModule,
      providers: [{ provide: APP_CONFIG, useValue: config }],
    };
  }
}
