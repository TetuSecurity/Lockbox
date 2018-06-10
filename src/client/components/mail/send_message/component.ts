import {Component} from '@angular/core';
import {FormGroup, Validators, FormControl, FormBuilder} from '@angular/forms';   
import {Observable, forkJoin, of as ObservableOf} from 'rxjs';
import {flatMap, map, finalize} from 'rxjs/operators';
import {SubscriberComponent} from '@core/';
import {SecureMessage, Message, SecureMetadata} from '@models/message';
import {AuthService, MailService, CryptoService} from '@services/';

@Component({
    selector: 'send-message',
    templateUrl: './template.html',
    styleUrls: ['./styles.scss']
})
export class SendMessageComponent extends SubscriberComponent {

    get isFile(): boolean {
        return this.messageForm.get('isFile').value;
    }

    formControls = {
        'recipient': new FormControl('', [Validators.required, Validators.email]),
        'includeSender': new FormControl(false, [Validators.required]),
        'subject': new FormControl('', [Validators.required]),
        'isFile': new FormControl(false, []),
        'messageText':  new FormControl('', [/*TODO add required validator if not isFile*/]),
        'file':  new FormControl('', [/*TODO add required validator if isFile*/]),
    };

    messageForm: FormGroup;
    sending: boolean = false;

    constructor(
        private _fb: FormBuilder,
        private _crypto: CryptoService,
        private _mail: MailService,
        private _auth: AuthService
    ) {
        super();
        this.messageForm = this._fb.group(this.formControls);
    }

    fileChange(event: any) {
        console.log(event);
    }

    sendMessages() {
        console.log('sending message');
        this.sending = true;
        this.addSubscription(
            this._encryptInfo(
                this.messageForm.get('recipient').value,
                this.messageForm.get('includeSender').value,
                this.isFile,
                this.messageForm.get('subject').value,
                this.isFile ? this.messageForm.get('file').value : this.messageForm.get('messageText').value
            ).pipe(
                flatMap(msg => this._mail.sendMessage(this.messageForm.get('recipient').value, msg)),
                finalize(() => this.sending = false)
            )
            .subscribe(_ => console.log(_), err => console.error(err))
        );
    }

    private _encryptInfo(rcp: string, includeSender: boolean, isFile: boolean, subject: string, contents: string): Observable<SecureMessage> {

        let contentsBuffer = contents;
        if (!isFile) {
            contentsBuffer = new Buffer(contents, 'utf8').toString('base64'); // make text and files alike use base64
        }

        return this._crypto.generateAESKey()
        .pipe(
            flatMap(aeskey => {
                const metadata: SecureMetadata = {
                    ContentsType: isFile ? 'file' : 'message',
                    Sender: includeSender ? this._auth.getUserEmail() : undefined,
                    Subject: subject
                };
                const metadataString = JSON.stringify(metadata);
                const iv = this._crypto.generateRandomness();
                return forkJoin(
                    this._crypto.encryptData(
                        this._crypto.encodeText(metadataString, 'utf8'),
                        aeskey,
                        iv
                    ),
                    this._crypto.encryptData(
                        this._crypto.encodeText(contentsBuffer, 'base64'),
                        aeskey,
                        iv
                    ),
                    ObservableOf({Key: aeskey, IV: iv}),
                    this._mail.getPublicKey(rcp)
                )
            }),
            flatMap(([encryptedMetadata, encryptedData, keyInfo, rcp]) => {
                return this._crypto.wrapCEK(keyInfo.Key, rcp.Key)
                .pipe(
                    map(wrappedCek => ({Address: rcp.Address, Key: wrappedCek})),
                    map((encKey: {Address:string, Key: ArrayBuffer})  => {
                        const message: SecureMessage = {
                            EncryptedKey: this._crypto.decodeText(encKey.Key, 'base64'),
                            IV: this._crypto.decodeText(keyInfo.IV, 'base64'),
                            Metadata: this._crypto.decodeText(encryptedMetadata,'base64'),
                            Contents: this._crypto.decodeText(encryptedData, 'base64'),
                        };
                        return message;
                    })
                )
            })
        );
    }
    
}
