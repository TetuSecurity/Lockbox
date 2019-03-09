import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {SharedModule} from '@modules/shared';
import {NotLoggedInGuard} from '@guards/index';
import {LoginComponent} from '@components/index';

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
