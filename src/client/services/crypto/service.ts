import {Injectable} from '@angular/core';
import {from, Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {BrowserStorageService} from '@services/caching';

@Injectable({
    providedIn: 'root'
})
export class CryptoService {
    private _cryptoHelpers;
    private _crypto;
    private _privKey: CryptoKey;

    constructor(
        private _store: BrowserStorageService
    ) {
        try {
            this._cryptoHelpers = (window.crypto || window['mscrypto'])
            this._crypto = this._cryptoHelpers.subtle;
            this.loadPrivateKey();
        } catch(err) {
            alert('Your browser does not support the WebCryptoAPI. Please switch to a different browser');
            console.error('Your browser does not support the WebCryptoAPI', err);
        }
    }

    // global
    isSupported() {
        return !!this._crypto;
    }

    generateRandomness(length: number = 16): ArrayBuffer {
        return this._cryptoHelpers.getRandomValues(new Uint8Array(length)).buffer;
    }

    encodeText(str: string, source_encoding?: string): ArrayBuffer {
        return new Buffer(str, source_encoding).buffer;
    }

    decodeText(buf: ArrayBuffer, target_encoding?: string): string {
        return Buffer.from(buf).toString(target_encoding || 'base64');
    }

    storePrivateKey(key: CryptoKey) {
        this._privKey = key;
        this._exportPrivateKey(key)
        .subscribe(keystring => {
            try {
                this._store.setItem('_pk', keystring, ['session', 'memory']);
            } catch (e) {
                console.error('could not save local pk securely');
            }
        }, err => {
            console.error(err);
        });
    }

    loadPrivateKey() {
        const saved_pk = this._store.getItem('_pk', ['session', 'memory']);
        if (saved_pk) {
            this.importPrivateKey(this.encodeText(saved_pk, 'base64'))
            .subscribe(
                key => this._privKey = key,
                err => {
                    throw(err);
                }
            );
        }
    }

    // run on logout to make sure no stored keys are left
    cleanup() {
        this._privKey = undefined;
        try {
            this._store.removeItem('_pk', ['session', 'memory']);
        } catch (e) {
            console.log(e);
        }
    }

    // SHA-512
    hash(data: ArrayBuffer): Observable<ArrayBuffer> {
        return from<ArrayBuffer>(
            this._crypto.digest(
                {
                    name: 'SHA-512'
                },
                data
            )
        );
    }

    // PBKDF2
    generatePasswordKey(password: ArrayBuffer): Observable<CryptoKey> {
        return from<CryptoKey>(
            this._crypto.importKey(
                'raw',
                password,
                {name: 'PBKDF2'},
                false,
                ['deriveKey']
            )
        );
    }

    deriveWrapper(passKey: CryptoKey, salt: ArrayBuffer): Observable<CryptoKey> {
        return from<CryptoKey>(
            this._crypto.deriveKey(
                {
                    name: 'PBKDF2',
                    salt,
                    iterations: 1024,
                    hash: {name: 'SHA-512'}
                },
                passKey,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['wrapKey', 'unwrapKey']
            )
        );
    }

    // AES-GCM
    generateAESKey(): Observable<CryptoKey> {
        return from<CryptoKey>(
            this._crypto.generateKey(
                {
                    name: 'AES-GCM',
                    length: 256
                },
                true,
                ['encrypt', 'decrypt']
            )
        );
    }

    // Encrypt the RSA Private Key for storage on server
    wrapPrivateKey(wrappingKey: CryptoKey, privateKey: CryptoKey, iv: ArrayBuffer): Observable<string> {
        return from<ArrayBuffer>(
            this._crypto.wrapKey(
                'pkcs8',
                privateKey,
                wrappingKey,
                {
                    name: 'AES-GCM',
                    iv
                }
            )
        ).pipe(
            map(buf => this.decodeText(buf))
        );
    }

    // Decrypt the private key stored on server
    unwrapPrivateKey(wrappingKey: CryptoKey, wrapped: ArrayBuffer, iv: ArrayBuffer): Observable<CryptoKey> {
        return from<CryptoKey>(
            this._crypto.unwrapKey(
                'pkcs8',
                wrapped,
                wrappingKey,
                {
                    name: 'AES-GCM',
                    iv
                },
                {
                    name: "RSA-OAEP",
                    hash: {name: 'SHA-512'}
                },
                true,
                ['unwrapKey']
            )
        );
    }
    // encrypt actual data
    encryptData(data: ArrayBuffer, key: CryptoKey, iv: ArrayBuffer): Observable<ArrayBuffer> {
        return from<ArrayBuffer>(
            this._crypto.encrypt(
                {
                    name: 'AES-GCM',
                    iv
                },
                key,
                data
            )
        );
    }

    // decrypt actual data
    decryptData(data: ArrayBuffer, key: CryptoKey, iv: ArrayBuffer): Observable<ArrayBuffer> {
        return from<ArrayBuffer>(
            this._crypto.decrypt(
                {
                    name: 'AES-GCM',
                    iv
                },
                key,
                data
            )
        );
    }

    // RSA-OAEP
    generateKeypair(): Observable<CryptoKeyPair> {
        return from<CryptoKeyPair>(
            this._crypto.generateKey(
                {
                    name: 'RSA-OAEP',
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                    hash: {name: 'SHA-512'}
                },
                true,
                ['wrapKey', 'unwrapKey']
            )
        );
    }

    wrapCEK(key: CryptoKey, wrapper: CryptoKey): Observable<ArrayBuffer> {
        return from<ArrayBuffer>(
            this._crypto.wrapKey(
                'raw',
                key,
                wrapper,
                {
                    name: 'RSA-OAEP',
                    hash: {name: 'SHA-512'},
                }
            )
        );
    }

    unwrapCEK(wrapped: ArrayBuffer, unwrapper?: CryptoKey): Observable<CryptoKey> {
        return from<CryptoKey>(
            this._crypto.unwrapKey(
                'raw',
                wrapped,
                unwrapper || this._privKey,
                {
                    name: 'RSA-OAEP',
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                    hash: {name: 'SHA-512'},
                },
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['decrypt']
            )
        );
    }

    exportPublicKey(publicKey: CryptoKey): Observable<string> {
        return from<any>(
            this._crypto.exportKey(
                'spki',
                publicKey
            )
        ).pipe(
            map(buf => this.decodeText(buf, 'base64'))
        );
    }

    importPublicKey(keystring: ArrayBuffer): Observable<CryptoKey> {
        return from<CryptoKey>(
            this._crypto.importKey(
                'spki',
                keystring,
                {
                    name: 'RSA-OAEP',
                    hash: {name: 'SHA-512'}
                },
                true,
                ['wrapKey']
            )
        );
    }

    importPrivateKey(keystring: ArrayBuffer): Observable<CryptoKey> {
        return from<CryptoKey>(
            this._crypto.importKey(
                'pkcs8',
                keystring,
                {
                    name: 'RSA-OAEP',
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                    hash: {name: 'SHA-512'}
                },
                true,
                ['unwrapKey']
            )
        );
    }

    // Only use to store against refreshes, do not use outside this service
    private _exportPrivateKey(privateKey: CryptoKey): Observable<string> {
        return from<ArrayBuffer>(
            this._crypto.exportKey(
                'pkcs8',
                privateKey
            )
        ).pipe(
            map(buf => this.decodeText(buf, 'base64'))
        );
    }
}
