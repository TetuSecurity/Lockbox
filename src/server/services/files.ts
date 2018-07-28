import {Observable} from 'rxjs';
import {DatabaseService} from './db';

export class FileService {

    constructor (private _db: DatabaseService) {}

    createRootDir(userId: string): Observable<void> {
        return this._db.query('Insert into `files` (`Id`, `EncryptedName`, `IsDirectory`) VALUES(?, ?, 1)', [userId, '/']);
    }
}
