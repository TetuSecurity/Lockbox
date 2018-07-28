import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {BrowserModule} from '@angular/platform-browser';
import {SharedModule} from '@modules/shared';
import {AppComponent} from '@components/';
import {IsLoggedInGuard, NotLoggedInGuard} from '@guards/'

@NgModule({
    bootstrap: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        SharedModule,
        RouterModule.forRoot(
            [
                {path: 'login', loadChildren: './routes/+login/module#LazyLoginModule'},
                {path: 'signup', loadChildren: './routes/+signup/module#LazySignupModule'},
                {path: 'files', loadChildren: './routes/+files/module#LazyFilesModule'},
                {path: '', loadChildren: './routes/+mail/module#LazyMailModule'},
            ]
        )
    ],
    declarations: [
        AppComponent
    ]
})
export class AppModule {}
