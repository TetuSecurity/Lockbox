import {Observable, throwError} from 'rxjs';
import {map} from 'rxjs/operators';
import {DatabaseService} from './db';
import {EncryptedDirectory} from '../models/inode';

export class FileService {

    constructor (private _db: DatabaseService) {}

    createRootDir(userId: string): Observable<void> {
        return this._db.query('Insert into `inodes` (`INodeId`, `EncryptedName`, `IsDirectory`) VALUES(?, ?, 1);', [userId, '/']);
    }

    getRoot(userId: string): Observable<EncryptedDirectory> {
        const q = 'Select i.*, ua.`EncryptedKey` from `inodes` i'
        + ' join `user_access` ua on i.`INodeId` = ua.`INodeId`'
        + ' where i.`ParentId`=? AND ua.`UserId`=?;'
        return this._db.query(q, [userId, userId]).pipe(
            map(files => {
                let children = [];
                if (files && files.length > 0) {
                    children = files;
                }
                const root: EncryptedDirectory = {
                    INodeId: userId,
                    EncryptedName: '/',
                    IsDirectory: true,
                    Children: children,
                    EncryptedKey: 'not necessary for root',
                    IV: 'not necessary for root'
                };
                return root;
            })
        );
    }

    getDirectory(userId: string, dirId: string): Observable<EncryptedDirectory> {
        const q = 'Select i.*, ua.`EncryptedKey` from `inodes` i'
        + ' join `user_access` ua on i.`INodeId` = ua.`INodeId`'
        + ' where (i.`ParentId`=? OR i.`INodeId`=?) AND ua.`UserId`=?;'
        return this._db.query(q, [dirId, dirId, userId]).pipe(
            map(nodes => {
                const dir = nodes.find(n => n.INodeId === dirId);
                if (!dir) {
                    throw new Error('Could not find that directory');
                }
                let children = nodes.filter(n => n.ParentId === dirId);
                dir.Children = children || [];
                return dir;
            })
        );
    }
}
