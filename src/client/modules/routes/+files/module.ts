import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {SharedModule} from '@modules/shared';
import {IsLoggedInGuard} from '@guards/loggedin';
import {FilesystemComponent} from '@components/filesystem/component';

@NgModule({
    imports: [
        SharedModule,
        RouterModule.forChild(
            [
                {path: '', pathMatch: 'full', canActivate: [IsLoggedInGuard], component: FilesystemComponent},
            ]
        )
    ],
    declarations: [
        FilesystemComponent
    ]
})
export class LazyFilesModule {}
