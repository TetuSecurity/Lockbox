import {Observable, forkJoin, of} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import * as uuid from 'uuid/v4';
import {DatabaseService} from './db';
import {EncryptedDirectory, EncryptedFile} from '../models/inode';

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

    createDirectory(userId: string, dir: EncryptedDirectory): Observable<EncryptedDirectory> {
        const inodeId = uuid();
        const q = 'Insert into `inodes` (`INodeId`, `EncryptedName`, `IV`, `ParentId`, `IsDirectory`)'
        + ' VALUES (?, ?, ?, ?, 1);';
        const  args = [inodeId, dir.EncryptedName, dir.IV, dir.ParentId || userId];
        return this._db.query(q, args)
        .pipe(
            switchMap(
                _ => this._db.query('Insert into `user_access` (`UserId`, `INodeId`, `EncryptedKey`) VALUES(?, ?, ?);', [userId, inodeId, dir.EncryptedKey])
            ),
            map(_ => ({...dir, INodeId: inodeId}))
        );
    }

    createFile(userId: string, file: EncryptedFile): Observable<EncryptedFile> {
        const inodeId = uuid();
        const fileId = uuid();
        const q = 'Insert into `inodes` (`INodeId`, `EncryptedName`, `MimeType`, `FileId`, `IV`, `ParentId`, `IsDirectory`)'
        + ' VALUES (?, ?, ?, ?, ?, ?, 0);';
        const  args = [inodeId, file.EncryptedName, file.MimeType, fileId, file.IV, file.ParentId || userId];
        return this._db.query(q, args)
        .pipe(
            switchMap(
                _ => forkJoin(
                    this._db.query('Insert into `user_access` (`UserId`, `INodeId`, `EncryptedKey`) VALUES(?, ?, ?);', [userId, inodeId, file.EncryptedKey]),
                    this._db.query('Insert into `file_locations` (`FileId`, `Location`) VALUES (?, ?);', [fileId, `/storage/${fileId}`])
                )
            ),
            map(_ => ({...file, INodeId: inodeId, FileId: fileId}))
        );
    }

    uploadFile(userId: string, fileId: string, contents: any): Observable<any> {
        return of('Not implemented yet!');

        // look up location and access by file Id, verify the user has access
        // send contents to location on disk or s3 (storage service?)
        // return status code
    }

    downloadFile(userId: string, fileId: string): Observable<any> {
        return of('Not implemented yet!');

        // look up location and access by file Id, verify the user has access
        // load contents from location on disk or s3 (storage service?)
        // return contents
    }
}
