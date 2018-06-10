import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {SharedModule} from '@modules/shared';
import {InboxComponent, SendMessageComponent} from '@components/mail';
import {IsLoggedInGuard} from '@guards/loggedin';

@NgModule({
    imports: [
        SharedModule,
        RouterModule.forChild(
            [
                {path: '', pathMatch: 'full', canActivate: [IsLoggedInGuard], component: InboxComponent},
                {path: 'send', canActivate: [IsLoggedInGuard], component: SendMessageComponent}
            ]
        )
    ],
    declarations: [
        InboxComponent,
        SendMessageComponent
    ]
})
export class MailLazyModule {}
