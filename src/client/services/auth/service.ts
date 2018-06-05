import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, forkJoin, of as ObservableOf} from 'rxjs';
import {map, flatMap, tap} from 'rxjs/operators';
import {CryptoService} from '@services/crypto/service';
import {LoginResponse} from '@models/';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    constructor(
        private _http: HttpClient,
        private _crypto: CryptoService
    ) {}

    login(email: string, password: string): Observable<any> {
        return this._crypto.hash(this._crypto.encodeText(password))
        .pipe(
            flatMap(passbuf => {
                const passHash = this._crypto.decodeText(passbuf, 'hex');
                return forkJoin(
                    this._http.post<LoginResponse>('/api/auth/login/', {Email: email, Password: passHash}),
                    this._crypto.generatePasswordKey(password)
                );
            }),
            flatMap(([response, passKey]) => 
                forkJoin(
                    ObservableOf(response),
                    this._crypto.deriveWrapper(passKey, this._crypto.encodeText(response.Salt, 'base64'))
                )
            ),
            flatMap(([response, passKey]) => 
                this._crypto.unwrapPrivateKey(
                    passKey, 
                    this._crypto.encodeText(response.PrivateKey, 'base64'), 
                    this._crypto.encodeText(response.IV, 'base64')
                )
            ),
            tap(privKey => this._crypto.storePrivateKey(privKey)),
            map(_ => true) // dont return the private key, just an indicator of success
        );
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
            tap(([wrapper, keypair]) => this._crypto.storePrivateKey(keypair.privateKey)),
            flatMap(([wrapper, keypair]) => forkJoin(
                this._crypto.exportPublicKey(keypair.publicKey),
                this._crypto.wrapPrivateKey(wrapper, keypair.privateKey, iv),
                this._crypto.hash(this._crypto.encodeText(password)).pipe(map(data => this._crypto.decodeText(data, 'hex')))      
            )),
            flatMap(([PublicKey, PrivateKey, Password]) => {
                const Salt = this._crypto.decodeText(salt);
                const IV = this._crypto.decodeText(iv);
                return this._http.post<void>('/api/auth/signup', {Email: email, PublicKey, PrivateKey, Salt, IV, Password});
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
