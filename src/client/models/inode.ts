export interface INode {
    id: string; // uuid
    name: string; //  friendly name
    owner: User; // Record who owns the file
    parent?: INode; // reference to parent or null for root
    sharedWith?: Permission[]; // Record each user and their permissions, only if visible if you are the owner
}

export interface Directory extends INode {
    children: INode[]; // INodes beneath current
}

export interface File extends INode {
    contents: any; // file contents
    mimeType: string;
    lastModified: string; 
}

export interface Permission {
    canRead: boolean; // only one that makes sense right now
    canWrite: boolean;
    canShare: boolean;
    user: User;
}

export interface User {
    id: string; // uuid
    email: string;
}


