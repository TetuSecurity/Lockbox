import {Component, OnInit} from '@angular/core';
import {SecureMessage, Message} from '@models/message';
import {SubscriberComponent} from '@core/';
import {CryptoService} from '@services/crypto/service';
import {flatMap, map} from 'rxjs/operators';
import {Observable} from 'rxjs';

@Component({
    selector: 'inbox',
    templateUrl: './template.html',
    styleUrls: ['./styles.scss']
})
export class InboxComponent extends SubscriberComponent implements OnInit {

    messages: Message[] = [];

    constructor(
        private _crypto: CryptoService,
        // private _mail: MailService
    ) {
        super();
    }

    ngOnInit() {
        // this.addSubscription(
        //     this._mail.getMessages()
        //     .subscribe(
        //         messages => this.messages = messages
        //     )
        // );
    }

    decryptInfo(message: SecureMessage): Observable<Message> {
        return this._crypto.unwrapCEK(
            this._crypto.encodeText(message.EncryptedKey, 'base64')
        ).pipe(
            flatMap(cek => {
                return this._crypto.decryptData(
                    this._crypto.encodeText(message.Metadata, 'base64'),
                    cek,
                    this._crypto.encodeText(message.IV, 'base64')
                ).pipe(
                    map(buf => {
                        const Metadata = JSON.parse(this._crypto.decodeText(buf, 'utf8'));
                        return {
                            Key: cek,
                            IV: message.IV,
                            Metadata,
                            Contents: message.Contents
                        }
                    })
                )
            })
        );
    }
    
}
