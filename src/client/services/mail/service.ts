import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {flatMap, map} from 'rxjs/operators';
import {CryptoService} from '@services/crypto/service';
import {SecureMessage} from '@models/message';

@Injectable({
    providedIn: 'root'
})
export class MailService {

    constructor(
        private  _http: HttpClient,
        private _crypto: CryptoService
    ) { }

    getPublicKey(keyholder: string): Observable<{Address: string, Key: CryptoKey}> {
        return this._http.post<{Address: string, Key: string}>('/api/mail/keys/search', {Email: keyholder})
        .pipe(
            flatMap(response => 
                this._crypto.importPublicKey(this._crypto.encodeText(response.Key, 'base64'))
                .pipe(
                    map((key: CryptoKey) => ({Address: response.Address, Key: key}))
                )
            )
        );
    }

    sendMessage(address: string, message: SecureMessage): Observable<any> {
        return this._http.post(`/api/mail/send/${address}`, {Message: message});
    }
}
