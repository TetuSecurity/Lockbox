import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, forkJoin, of as ObservableOf} from 'rxjs';
import {map, flatMap, tap} from 'rxjs/operators';
import {CryptoService} from '@services/crypto/service';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    constructor(
        private _http: HttpClient,
        private _crypto: CryptoService
    ) {}

    login(email: string, password: string): Observable<any> {
        const nonce = this._crypto.decodeText(this._crypto.generateSalt());
        return this._http.post<void>('/api/auth/login/init', {Email: email, Nonce: nonce})
        .pipe(
            flatMap((response: any) => 
                this._crypto.generatePasswordKey(password).pipe(
                    flatMap(passKey => this._crypto.deriveWrapper(passKey, this._crypto.encodeText(response.Salt, 'base64'))),
                    flatMap(passKey => this._crypto.unwrapPrivateKey(passKey, this._crypto.encodeText(response.PrivateKey, 'base64'), this._crypto.encodeText(response.IV, 'base64'))),
                    tap(privKey => console.log('Got priv key', privKey)),
                    tap(privKey => this._crypto.storePrivateKey(privKey)),
                    flatMap(privKey => this._crypto.unwrapChallengeKey(this._crypto.encodeText(response.ChallengeKey.ciphertext, 'base64'), privKey)),
                    tap(chalKey => console.log('Got chal Key', chalKey)),                    
                    flatMap(chalKey => 
                        this._crypto.decryptData(
                            this._crypto.encodeText(response.Challenge.ciphertext, 'base64'),
                            chalKey,
                            response.ChallengeKey.iv
                        )
                    ),
                    tap(solution => console.log('Got solution', solution)), 
                    flatMap(solution => this._http.post(`/api/auth/login/${response.ChallengeId}`, {Nonce: nonce, Solution: solution}))
                )
            )
        )
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
