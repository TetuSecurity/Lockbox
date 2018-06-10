export interface SecureMessage {
    EncryptedKey: string;
    IV: string;
    Metadata: string; // base64 encoding of encrypted metadata
    Contents: string;
}

export interface Message {
    Key: CryptoKey;
    IV: string;
    Metadata: SecureMetadata;
    Contents: any;
}

export interface SecureMetadata {
    Sender?: string; // Replace with encrypted user object to verify key
    Recipient?: string[];
    Subject: string; // message subject or filename
    ContentsType: 'message'|'file';
}
