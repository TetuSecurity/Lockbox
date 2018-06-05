import {Injectable} from '@angular/core';
import {from, Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class CryptoService {
    private _cryptoHelpers;
    private _crypto;
    private _privKey: CryptoKey;

    constructor() {
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

    generateSalt(): ArrayBuffer {
        return this._cryptoHelpers.getRandomValues(new Uint8Array(16)).buffer;
    }

    encodeText(str: string, enc?: string): ArrayBuffer {
        return new Buffer(str, enc).buffer;
    }

    decodeText(txt: ArrayBuffer, enc?: string): string {
        return Buffer.from(txt).toString(enc || 'base64');
    }

    storePrivateKey(key: CryptoKey) {
        this._privKey = key;
        this._exportPrivateKey(key)
        .subscribe(keystring => {
            try {
                sessionStorage.setItem('_pk', keystring);
            } catch (e) {
                console.error('could not save local pk securely');
            }
        }, err => {
            console.error(err);
        });
    }

    loadPrivateKey() {
        const saved_pk = sessionStorage.getItem('_pk');
        if (saved_pk) {
            this.importPrivateKey(saved_pk)
            .subscribe(key => this._privKey = key);
        }
    }

    // PBKDF2
    generatePasswordKey(password: string): Observable<CryptoKey> {
        return from<CryptoKey>(
            this._crypto.importKey(
                'raw',
                this.encodeText(password),
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
                ['unwrapKey', 'decrypt']
            )
        );
    }

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
                ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
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
            map(buf => this._toPEM(buf))
        );
    }

    importPrivateKey(keystring: string): Observable<CryptoKey> {
        return from<CryptoKey>(
            this._crypto.importKey(
                'pkcs8',
                this.encodeText(keystring, 'base64'),
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

    // Get AES key used to encrypt challenge
    unwrapChallengeKey(challengeKey: ArrayBuffer, unwrapper?: CryptoKey): Observable<ArrayBuffer> {
        return from<ArrayBuffer>(
            this._crypto.unwrapKey(
                'raw',
                challengeKey,
                unwrapper || this._privKey,
                {
                    name: "RSA-OAEP",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                    hash: {name: "SHA-512"},
                },
                {
                    name: "AES-GCM",
                    length: 256
                },
                true,
                ['decrypt']
            )
        );
    };
    // Get AES key used to encrypt challenge
    decryptChallengeKey(challengeKey: ArrayBuffer, unwrapper?: CryptoKey): Observable<ArrayBuffer> {
        return from<ArrayBuffer>(
            this._crypto.decrypt(
                {
                    name: 'RSA-OAEP'
                },
                unwrapper || this._privKey,
                challengeKey
            )
        );
    };

    // Only use to store against refreshes, do not use outside this service
    private _exportPrivateKey(privateKey: CryptoKey): Observable<string> {
        return from<ArrayBuffer>(
            this._crypto.exportKey(
                'pkcs8',
                privateKey
            )
        ).pipe(
            map(buf => this.decodeText(buf))
        );
    }

    private _toPEM(spki: ArrayBuffer): string {
        const b64key = this.decodeText(spki, 'base64');
        const pemText = b64key.replace(/(.{64})/g, '$1\n');
        console.log(pemText);
        return `-----BEGIN PUBLIC KEY-----\n${pemText}\n-----END PUBLIC KEY-----`
    }


}
