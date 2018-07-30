export interface INode {
    INodeId: string; // uuid
    Name: string; //  friendly name
    ParentId?: string; // reference to parent iNode Id or null for root
    Key?: CryptoKey;
    IV?: string;
    IsDirectory: boolean;
}

export interface Directory extends INode {
    IsDirectory: true; // indicate is Dir
    Children: INode[]; // INodes beneath current
}

export interface File extends INode {
    IsDirectory: false;
    Contents?: any; // file contents available after decryption
    FileId?: string; // uuid for fetching encrypted file
    MimeType: string;
    LastModifiedDate?: string;
    CreatedDate?: string;
}

export interface EncryptedINode { // represents the payload to/from API
    INodeId: string; // uuid
    EncryptedName: string; // encrypted inode name
    ParentId?: string; // uuid, needed for db
    EncryptedKey: string
    IV: string; // IV used in AES decryption
    IsDirectory: boolean;
}

export interface EncryptedDirectory extends EncryptedINode {
    IsDirectory: true;
    Children: EncryptedINode[];
}

export interface EncryptedFile extends EncryptedINode {
    FileId: string; // uuid needed to get file contents from API
    MimeType: string;
    LastModifiedDate?: string;
    CreatedDate?: string;
    IsDirectory: false;
}

export interface UserAccess {
    UserId: string; // uuid
    EncryptedKey: string; // string of the AES key used for metadata/content decryption
}


