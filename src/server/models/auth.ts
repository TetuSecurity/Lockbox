export interface UserSession {
    UserId: string;
    Email: string;
    SessionId: string;
    Expires: number;
}

export interface SessionInfo {
    SessionId: string;
    UserId: number;
    Expires: number;
    UserAgent?: string;
    Created?: Date;
    LastAccessed?: Date;
}
