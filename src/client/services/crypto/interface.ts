import {Observable} from 'rxjs';

export declare class ICryptoService {
    isSupported(): boolean;
    generateRandomness(length?: number): ArrayBuffer;
    encodeText(str: string, source_encoding?: string): ArrayBuffer;
    decodeText(buf: ArrayBuffer, target_encoding?: string): string;
    storePrivateKey(key: CryptoKey): void;
    storePublicKey(key: CryptoKey): void;
    loadPrivateKey(): void;
    loadPublicKey(): void;
    cleanup(): void;
    hash(data: ArrayBuffer): Observable<ArrayBuffer>;
    generatePasswordKey(password: ArrayBuffer): Observable<CryptoKey>;
    deriveWrapper(passKey: CryptoKey, salt: ArrayBuffer): Observable<CryptoKey>;
    generateAESKey(): Observable<CryptoKey>;
    wrapPrivateKey(wrappingKey: CryptoKey, privateKey: CryptoKey, iv: ArrayBuffer): Observable<string>;
    unwrapPrivateKey(wrappingKey: CryptoKey, wrapped: ArrayBuffer, iv: ArrayBuffer): Observable<CryptoKey>;
    encryptData(data: ArrayBuffer, key: CryptoKey, iv: ArrayBuffer): Observable<ArrayBuffer>;
    decryptData(data: ArrayBuffer, key: CryptoKey, iv: ArrayBuffer): Observable<ArrayBuffer>;
    generateKeypair(): Observable<CryptoKeyPair>;
    wrapCEK(key: CryptoKey, wrapper?: CryptoKey): Observable<ArrayBuffer>;
    unwrapCEK(wrapped: ArrayBuffer, unwrapper?: CryptoKey): Observable<CryptoKey>;
    exportPublicKey(publicKey: CryptoKey): Observable<string>;
    importPublicKey(keystring: ArrayBuffer): Observable<CryptoKey>;
    importPrivateKey(keystring: ArrayBuffer): Observable<CryptoKey>;
}
