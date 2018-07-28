export interface UserSession {
    UserId: string;
    Email: string;
    SessionKey: string;
    Expires: number;
}

export interface SessionInfo {
    SessionKey: string;
    UserId: number;
    Expires: number;
    UserAgent?: string;
    Created?: Date;
    LastAccessed?: Date;
}
