import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {SharedModule} from '@modules/shared';
import {NotLoggedInGuard} from '@guards/';
import {LoginComponent} from '@components/';

@NgModule({
    imports: [
        SharedModule,
        RouterModule.forChild(
            [
                {path: '', pathMatch: 'full', canActivate: [NotLoggedInGuard], component: LoginComponent},
            ]
        )
    ],
    declarations: [
        LoginComponent
    ]
})
export class LazyLoginModule {}
