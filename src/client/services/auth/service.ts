import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, forkJoin} from 'rxjs';
import {map, flatMap, tap} from 'rxjs/operators';
import {CryptoService} from '@services/crypto/service';

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    private _passKey: CryptoKey;

    constructor(
        private _http: HttpClient,
        private _crypto: CryptoService
    ) {}

    login(email: string, password: string): Observable<any> {
        return this._http.post<void>('/api/auth/login', {Email: email, Password: password});
    }

    signup(email: string, password: string): Observable<any> {
        const salt = this._crypto.generateSalt();
        const iv = this._crypto.generateSalt();
        return forkJoin(
            this._crypto.generatePasswordKey(password).pipe(
                flatMap(passKey => this._crypto.deriveWrapper(passKey, salt)),
            ),
            this._crypto.generateKeypair()            
        ).pipe(
            flatMap(([wrapper, keypair]) => forkJoin(
                this._crypto.exportPublicKey(keypair.publicKey),
                this._crypto.wrapPrivateKey(wrapper, keypair.privateKey, iv)
            )),
            flatMap(([PublicKey, PrivateKey]) => {
                const Salt = this._crypto.decodeText(salt);
                const IV = this._crypto.decodeText(iv);
                return this._http.post<void>('/api/auth/signup', {Email: email, PublicKey, PrivateKey, Salt, IV});
            })
        );
    }

    logOut(): Observable<any> {
        return this._http.post<void>('/api/auth/logout', {});
    }

    isLoggedIn(): Observable<boolean> {
        return this._http.get<boolean>('/api/auth/valid');
    }

}
