import {NgModule} from '@angular/core';
import {RouterModule, ExtraOptions, PreloadAllModules} from '@angular/router';
import {BrowserModule} from '@angular/platform-browser';
import {SharedModule} from '@modules/shared';
import {AppComponent} from '@components/index';
import {IsLoggedInGuard, NotLoggedInGuard} from '@guards/index'
import {ICryptoService, WebCryptoService} from '@services/index';

const opts: ExtraOptions = {
    enableTracing: true,
    preloadingStrategy: PreloadAllModules,
    scrollPositionRestoration: 'enabled',
}

@NgModule({
    bootstrap: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        SharedModule,
        RouterModule.forRoot(
            [
                {path: 'login', canLoad: [NotLoggedInGuard], loadChildren: './routes/+login/module#LazyLoginModule'},
                {path: 'signup', canLoad: [NotLoggedInGuard], loadChildren: './routes/+signup/module#LazySignupModule'},
                {path: 'files', canLoad: [IsLoggedInGuard], loadChildren: './routes/+files/module#LazyFilesModule'},
                {path: '', loadChildren: './routes/+mail/module#LazyMailModule'},
            ],
            opts
        )
    ],
    declarations: [
        AppComponent
    ],
    providers: [
        {
            provide: ICryptoService, useClass: WebCryptoService
        }
    ]
})
export class AppModule {}
