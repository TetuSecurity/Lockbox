import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {SharedModule} from '@modules/shared';
import {IsLoggedInGuard} from '@guards/loggedin';
import {FilesystemComponent} from '@components/filesystem/component';
import {DirectoryResolver} from '@resolvers/directory';

@NgModule({
    imports: [
        SharedModule,
        RouterModule.forChild(
            [
                {path: '', pathMatch: 'full', canActivate: [IsLoggedInGuard], component: FilesystemComponent},
                {path: ':id', canActivate: [IsLoggedInGuard], component: FilesystemComponent, resolve: {directory: DirectoryResolver}, runGuardsAndResolvers: 'paramsChange'},
            ]
        )
    ],
    declarations: [
        FilesystemComponent
    ]
})
export class LazyFilesModule {}
