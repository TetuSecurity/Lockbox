import {Injectable} from '@angular/core';
import {from, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class CryptoService {
    private _cryptoHelpers;
    private _crypto;

    constructor() {
        try {
            this._cryptoHelpers = (window.crypto || window['mscrypto'])
            this._crypto = this._cryptoHelpers.subtle;
        } catch(err) {
            console.error('Your browser does not support the WebCryptoAPI', err);
        }
    }

    // global
    generateSalt(): ArrayBuffer {
        return this._cryptoHelpers.getRandomValues(new Uint8Array(16)).buffer;
    }

    encodeText(str: string): ArrayBuffer {
        return new Buffer(str).buffer;
    }

    decodeText(txt: ArrayBuffer, enc?: string): string {
        return Buffer.from(txt).toString(enc || 'base64');
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

    unwrapPrivateKey(wrappingKey: CryptoKey, wrapped: string, iv: ArrayBuffer): Observable<CryptoKey> {
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
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                    hash: {name: 'SHA-512'}
                },
                false,
                ['wrapKey', 'unwrapKey']
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

    exportPublicKey(publicKey: CryptoKey): Observable<string> {
        return from<ArrayBuffer>(
            this._crypto.exportKey(
                'spki',
                publicKey
            )
        ).pipe(
            map(buf => this.decodeText(buf))
        );
    }


}
