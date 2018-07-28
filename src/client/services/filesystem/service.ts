import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, forkJoin, pipe, of} from 'rxjs';
import {flatMap, map} from 'rxjs/operators';
import {EncryptedDirectory, Directory, EncryptedFile, File, FileMetadata, EncryptedINode, INode} from '@models/inode';
import {HttpCacheService} from '@services/caching';
import {CryptoService} from '@services/crypto/service';

@Injectable({
    providedIn: 'root'
})
export class FilesystemService {

    constructor(
        private _http: HttpClient,
        private _cache: HttpCacheService,
        private _crypto: CryptoService
    ) {

    }

    getRootDirectory(): Observable<Directory> {
        return this._cache.cacheRequest(
            'root_dir',
            this._http.get<{Id: string, Children: EncryptedINode[]}>('/api/files/'),
            {cacheTime: -1}
        ).pipe(
            flatMap(encDir => {
                return forkJoin(
                    of(encDir.Id),
                    ...(this.decryptChildren(encDir.Children))
                );
            }),
            map(([id, ...children]) => {
                const rootDir: Directory = {
                    IsDirectory: true,
                    Id: id,
                    Children: children,
                    Name: '/'
                };
                return rootDir;
            })
        );
    }

    getDirectory(id: string): Observable<Directory> {
        return this._cache.cacheRequest(
            `dir_${id}`,
            this._http.get<EncryptedDirectory>(`/api/files/${id}`),
            {cacheTime: -1}
        ).pipe(
            flatMap((encD: EncryptedDirectory) => this.decryptDirectoryFull(encD))
        );
    }

    decryptDirectoryFull(encD: EncryptedDirectory): Observable<Directory> {
        return this._crypto.unwrapCEK(
            this._crypto.encodeText(encD.EncryptedKey, 'base64')
        ).pipe(
            flatMap((cek: CryptoKey) => {
                return forkJoin(
                    this._crypto.decryptData(
                        this._crypto.encodeText(encD.EncryptedName, 'base64'),
                        cek,
                        this._crypto.encodeText(encD.IV, 'base64')
                    ),
                    of(cek),
                    ...(this.decryptChildren(encD.Children))
                )
            }),
            map(([nameBuf, cek, ...children]) => {
                const name = this._crypto.decodeText(nameBuf);
                const d: Directory = {
                    IsDirectory: true,
                    Id: encD.Id,
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
            flatMap((cek: CryptoKey) => {
                return forkJoin(
                    this._crypto.decryptData(
                        this._crypto.encodeText(encD.EncryptedName, 'base64'),
                        cek,
                        this._crypto.encodeText(encD.IV, 'base64')
                    ),
                    of(cek),
                    ...(this.decryptChildren(encD.Children))
                )
            }),
            map(([nameBuf, cek]: [ArrayBuffer, CryptoKey]) => {
                const name = this._crypto.decodeText(nameBuf);
                const d: Directory = {
                    IsDirectory: true,
                    Id: encD.Id,
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

    decryptFile(encF: EncryptedFile): Observable<File> {
        return this._crypto.unwrapCEK(
            this._crypto.encodeText(encF.EncryptedKey, 'base64')
        ).pipe(
            flatMap((cek: CryptoKey) => {
                return forkJoin(
                    this._crypto.decryptData(
                        this._crypto.encodeText(encF.EncryptedName, 'base64'),
                        cek,
                        this._crypto.encodeText(encF.IV, 'base64')
                    ),
                    this._crypto.decryptData(
                        this._crypto.encodeText(encF.EncryptedMetadata, 'base64'),
                        cek,
                        this._crypto.encodeText(encF.IV, 'base64')
                    ),
                    of(cek)
                )
            }),
            map(([nameBuf, metadataBuf, cek]: [ArrayBuffer, ArrayBuffer, CryptoKey]) => {
                const name = this._crypto.decodeText(nameBuf);
                const meatadataString = this._crypto.decodeText(metadataBuf);
                let metadata: FileMetadata = {
                    CreatedDate: '',
                    LastModifiedDate: '',
                    MimeType: 'text/plain'
                };
                try {
                    metadata = JSON.parse(meatadataString);
                } catch (e) {
                    console.error('Could not parse file metadata for ID', encF.Id);
                }
                const f: File = {
                    IsDirectory: false,
                    Id: encF.Id,
                    IV: encF.IV,
                    Key: cek,
                    Metadata: metadata,
                    Name: name,
                    ParentId: encF.ParentId,
                    FileId: encF.FileId
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
