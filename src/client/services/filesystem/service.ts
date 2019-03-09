import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, forkJoin, of} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {EncryptedDirectory, Directory, EncryptedFile, EncryptedINode, INode, File as DecryptedFile} from '@models/inode';
import {HttpCacheService} from '@services/caching';
import {ICryptoService} from '@services/crypto/index';

@Injectable({
    providedIn: 'root'
})
export class FilesystemService {

    constructor(
        private _http: HttpClient,
        private _cache: HttpCacheService,
        private _crypto: ICryptoService
    ) {

    }

    getRootDirectory(): Observable<Directory> {
        return this._cache.cacheRequest(
            'root_dir',
            this._http.get<EncryptedDirectory>('/api/files/'),
            {cacheTime: 5*60*1000}
        ).pipe(
            switchMap(encDir => this.handleRootDir(encDir))
        );
    }

    getDirectory(id: string): Observable<Directory> {
        return this._cache.cacheRequest(
            `dir_${id}`,
            this._http.get<EncryptedDirectory>(`/api/files/${id}`),
            {cacheTime: 30000}
        ).pipe(
            switchMap((encD: EncryptedDirectory) => {
                if (!!encD.ParentId) {
                    return this.decryptDirectoryFull(encD);
                } else {
                    return this.handleRootDir(encD);
                }
            })
        );
    }

    addDirectory(parentId: string, name: string): Observable<Directory> {
        this._cache.invalidateCache('root_dir'); // just in case
        this._cache.invalidateCache(`dir_${parentId}`);
        const dir: any = { // partial directory
            Children: [],
            IsDirectory: true,
            Name: name,
            ParentId: parentId,
        };
        return this._crypto.generateAESKey()
        .pipe(
            switchMap(aesKey => {
                const iv = this._crypto.generateRandomness();
                dir.IV = this._crypto.decodeText(iv, 'base64');
                dir.Key = aesKey;
                return forkJoin(
                    this._crypto.encryptData(
                        this._crypto.encodeText(name, 'utf8'),
                        aesKey,
                        iv
                    ),
                    this._crypto.wrapCEK(aesKey)
                );
            }),
            switchMap(([encryptedNameBuf, encryptedKeyBuf]) => {
                const encryptedName = this._crypto.decodeText(encryptedNameBuf, 'base64');
                const encryptedKey = this._crypto.decodeText(encryptedKeyBuf, 'base64');
                const encDir = {
                    EncryptedName:  encryptedName,
                    EncryptedKey: encryptedKey,
                    IsDirectory: true,
                    Children: [],
                    IV: dir.IV,
                    ParentId: parentId
                };
                return this._http.post<EncryptedDirectory>('/api/files', encDir);
            }),
            map(encDir => {
                dir.INodeId = encDir.INodeId;
                return dir;
            })
        );
    }

    addFile(parentId: string, file: File): Observable<DecryptedFile> {
        this._cache.invalidateCache('root_dir'); // just in case
        this._cache.invalidateCache(`dir_${parentId}`);
        const decfile: any = { // partial file
            IsDirectory: false,
            Name: file.name,
            ParentId: parentId,
            MimeType: file.type
        };
        return this._crypto.generateAESKey()
        .pipe(
            switchMap(aesKey => {
                const iv = this._crypto.generateRandomness();
                decfile.IV = this._crypto.decodeText(iv, 'base64');
                decfile.Key = aesKey;
                return forkJoin(
                    this._crypto.encryptData(
                        this._crypto.encodeText(file.name, 'utf8'),
                        aesKey,
                        iv
                    ),
                    this._crypto.wrapCEK(aesKey)
                );
            }),
            switchMap(([encryptedNameBuf, encryptedKeyBuf]) => {
                const encryptedName = this._crypto.decodeText(encryptedNameBuf, 'base64');
                const encryptedKey = this._crypto.decodeText(encryptedKeyBuf, 'base64');
                const encFile = {
                    EncryptedName:  encryptedName,
                    EncryptedKey: encryptedKey,
                    IsDirectory: false,
                    IV: decfile.IV,
                    MimeType: decfile.MimeType,
                    ParentId: parentId
                };
                return this._http.post<EncryptedFile>('/api/files', encFile);
            }),
            switchMap(encFile => {
                decfile.INodeId = encFile.INodeId;
                decfile.FileId = encFile.FileId;
                return this.readFile(file);
            }),
            switchMap(contents => this._crypto.encryptData(contents, decfile.Key, decfile.IV)),
            switchMap(encryptedContents => {
                const encContents = this._crypto.decodeText(encryptedContents, 'base64');
                return this._http.post(`/api/files/content/${decfile.FileId}`, encContents);
            }),
            map(_ => decfile)
        );
    }

    readFile(file: File): Observable<ArrayBuffer> {
        return Observable.create(obs => {
            let errored = false;
            const reader = new FileReader();

            reader.addEventListener('error', (err) => {
                errored = true;
                obs.error(err);
            });

            reader.addEventListener('load', () => {
                if (!errored) {
                    obs.next(reader.result);
                    return obs.complete();
                }
            }, false);

            reader.readAsArrayBuffer(file);
        });
    }

    handleRootDir(encDir: EncryptedDirectory): Observable<Directory> {
        return forkJoin(
            of(encDir.INodeId),
            ...(this.decryptChildren(encDir.Children || []))
        ).pipe(
            map(([id, ...children]) => {
                const rootDir: Directory = {
                    IsDirectory: true,
                    INodeId: id,
                    Children: children,
                    Name: '/'
                };
                return rootDir;
            })
        );
    }

    decryptDirectoryFull(encD: EncryptedDirectory): Observable<Directory> {
        return this._crypto.unwrapCEK(
            this._crypto.encodeText(encD.EncryptedKey, 'base64')
        ).pipe(
            switchMap((cek: CryptoKey) => {
                return forkJoin(
                    (
                        (!!encD.ParentId)
                        ?
                        this._crypto.decryptData(
                            this._crypto.encodeText(encD.EncryptedName, 'base64'),
                            cek,
                            this._crypto.encodeText(encD.IV, 'base64')
                        )
                        :
                        of(this._crypto.encodeText(encD.EncryptedName, 'utf8'))
                    ),
                    of(cek),
                    ...(this.decryptChildren(encD.Children || []))
                )
            }),
            map(([nameBuf, cek, ...children]) => {
                const name = this._crypto.decodeText(nameBuf, 'utf8');
                const d: Directory = {
                    IsDirectory: true,
                    INodeId: encD.INodeId,
                    IV: encD.IV,
                    Key: cek,
                    Name: name,
                    ParentId: encD.ParentId,
                    Children: children
                };
                return d;
            })
        );
    }

    decryptDirectoryInfo(encD: EncryptedDirectory): Observable<Directory> {
        return this._crypto.unwrapCEK(
            this._crypto.encodeText(encD.EncryptedKey, 'base64')
        ).pipe(
            switchMap((cek: CryptoKey) => {
                return forkJoin(
                    this._crypto.decryptData(
                        this._crypto.encodeText(encD.EncryptedName, 'base64'),
                        cek,
                        this._crypto.encodeText(encD.IV, 'base64')
                    ),
                    of(cek)
                )
            }),
            map(([nameBuf, cek]: [ArrayBuffer, CryptoKey]) => {
                const name = this._crypto.decodeText(nameBuf, 'utf8');
                const d: Directory = {
                    IsDirectory: true,
                    INodeId: encD.INodeId,
                    IV: encD.IV,
                    Key: cek,
                    Name: name,
                    ParentId: encD.ParentId,
                    Children: [] // Left blank so we don't decrypt recursively
                };
                return d;
            })
        );
    }

    decryptFile(encF: EncryptedFile): Observable<DecryptedFile> {
        return this._crypto.unwrapCEK(
            this._crypto.encodeText(encF.EncryptedKey, 'base64')
        ).pipe(
            switchMap((cek: CryptoKey) => {
                return forkJoin(
                    this._crypto.decryptData(
                        this._crypto.encodeText(encF.EncryptedName, 'base64'),
                        cek,
                        this._crypto.encodeText(encF.IV, 'base64')
                    ),
                    of(encF.MimeType),                    
                    of(cek)
                )
            }),
            map(([nameBuf, mimeType, cek]: [ArrayBuffer, string, CryptoKey]) => {
                const name = this._crypto.decodeText(nameBuf, 'utf8');
                const f: DecryptedFile = {
                    IsDirectory: false,
                    INodeId: encF.INodeId,
                    IV: encF.IV,
                    Key: cek,
                    MimeType: mimeType,
                    Name: name,
                    ParentId: encF.ParentId,
                    FileId: encF.FileId,
                    LastModifiedDate: encF.LastModifiedDate,
                    CreatedDate: encF.CreatedDate
                };
                return f;
            })
        );
    }

    decryptChildren(children: EncryptedINode[]): Observable<INode>[] {
        return children.map(c => {
            if (c.IsDirectory) {
                return this.decryptDirectoryInfo(c as EncryptedDirectory)
            } else {
                return this.decryptFile(c as EncryptedFile);
            }
        });
    }
}
