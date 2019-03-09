import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {SharedModule} from '@modules/shared';
import {SignupComponent} from '@components/auth/signup/component';

@NgModule({
    imports: [
        SharedModule,
        RouterModule.forChild(
            [
                {path: '', pathMatch: 'full', component: SignupComponent},
                {path: '**', redirectTo: '/404'}
            ]
        )
    ],
    declarations: [
        SignupComponent
    ]
})
export class LazySignupModule {}
