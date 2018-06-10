import {Component, OnInit} from '@angular/core';
import {Observable, forkJoin, of as ObservableOf} from 'rxjs';
import {flatMap, map, tap} from 'rxjs/operators';
import {SubscriberComponent} from '@core/';
import {SecureMessage, Message, SecureMetadata} from '@models/message';
import {CryptoService} from '@services/';

@Component({
    selector: 'view-message',
    templateUrl: './template.html',
    styleUrls: ['./styles.scss']
})
export class ViewMessageComponent extends SubscriberComponent implements OnInit{

    message: Message;
    
    constructor(
        private _crypto: CryptoService,
    ) {
        super();
    }

    ngOnInit() {
        this.addSubscription(
            this._decryptMessage({
                EncryptedKey: 'EncryptedKey',
                IV: 'IV',
                Metadata: 'Metadata',
                Contents: 'Contents',
            }).pipe(
                tap(msg => this.message = msg)
            ).subscribe(
                msg => console.log(msg),
                err => console.error(err)
            )
        );
    }

    private _decryptMessage(enc: SecureMessage): Observable<Message> {
        return this._crypto.unwrapCEK(this._crypto.encodeText(enc.EncryptedKey, 'base64'), null)
        .pipe(
            flatMap(key => forkJoin(
                this._crypto.decryptData(this._crypto.encodeText(enc.Metadata, 'base64'), key, this._crypto.encodeText(enc.IV, 'base64')),
                this._crypto.decryptData(this._crypto.encodeText(enc.Contents, 'base64'), key, this._crypto.encodeText(enc.IV, 'base64')),
                ObservableOf(key)
            )),
            map(([metadata, contents, key]) => {
                const secureMetadata: SecureMetadata = JSON.parse(this._crypto.decodeText(metadata, 'utf8'));
                const msg: Message = {
                    Contents: (secureMetadata.ContentsType === 'file') ? contents : this._crypto.decodeText(contents, 'utf8'),
                    Metadata: secureMetadata,
                    IV: enc.IV,
                    Key: key
                };
                return msg;
            })
        );
    }
    
}
