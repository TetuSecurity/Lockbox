import {Observable} from 'rxjs';
import {join} from 'path';
import {Request} from 'express';
import {IStorageService} from './Istorage';
import {FSConfig} from '../../models/config';

export class FSStorageService implements IStorageService {

    constructor(
        private _fsConfig: FSConfig
    ) {

    }

    storeFile(fileId: string, req: Request): Observable<string> {
        const fileName = join(this._fsConfig.root, fileId);
        
        return Observable.create(obs => {

        });
    }    
    
    getFile(location: string): Observable<any> {
        throw new Error('Method not implemented.');
    }


}
