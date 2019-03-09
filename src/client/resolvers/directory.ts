import {Injectable} from '@angular/core';
import {Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, Router} from '@angular/router';
import {Observable, of, empty, throwError} from 'rxjs';
import {Directory} from '@models/index';
import {FilesystemService} from '@services/filesystem/service';
import {flatMap, catchError} from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class DirectoryResolver implements Resolve<Directory> {

    constructor(
        private _files: FilesystemService,
        private _router: Router
    ) {

    }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<Directory> {
        const id = route.paramMap.get('id');
        if (id) {
            return this._files.getDirectory(id)
            .pipe(
                flatMap(
                    dir => {
                        if (!dir) {
                            return throwError('404');
                        } else {
                            return of(dir);
                        }
                    }
                ),
                catchError(e => {
                    this._router.navigate(['/files']);
                    return empty();
                })
            );
        } else {
            this._files.getRootDirectory()
            .pipe(
                flatMap(
                    dir => {
                        if (!dir) {
                            return throwError('404');
                        } else {
                            return of(dir);
                        }
                    }
                ),
                catchError(e => {
                    this._router.navigate(['/404']);
                    return empty();
                })
            );
        }
    }
}
