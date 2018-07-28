import {Observable} from 'rxjs';
import {map, flatMap} from 'rxjs/operators';
import * as uuid from 'uuid/v4';
import {DatabaseService} from './db';
import {UserSession, SessionInfo} from '../models/auth';

const EXPIRATION_SECONDS = (12 * 60 * 60); // 12 hour expiration for now

export class SessionManager {
    constructor (private _db: DatabaseService) {}

    getActiveSessions(userId: string): Observable<SessionInfo[]> {
        return this._db.query('Select * from `sessions` where `UserId`=? AND `Active`=1', [userId])
        .pipe(
            map(sessions => {
                return sessions.map(s => {
                    s.LastUsed = new Date(s.LastUsed * 1000);
                    s.UserAgent = s.UserAgent ? JSON.parse(s.UserAgent) : null;
                    return s;
                });
            })
        );
    }

    getUserSession(SessionId: string): Observable<UserSession> {
        const q = 'Select u.UserId, u.Email, s.SessionId, s.Expires from `sessions` s'
        + ' join `users` u on u.UserId = s.UserId'
        + ' where s.Active=1 AND u.Active=1 AND s.SessionId=? AND s.Expires > ? LIMIT 1;';
        return this._db.query(q, [SessionId, Math.floor(new Date().valueOf()/1000)])
        .pipe(
            map(sessions => sessions.length ? sessions[0] : null)
        );
    }

    createSession(userId: string, userAgent?: string): Observable<{SessionId: string, Expires: number}> {
        const sessionId = uuid().replace(/\-/ig, '');
        const now = Math.floor(new Date().valueOf()/1000);
        const expires = now + EXPIRATION_SECONDS; // 30 day expiration for now
        const q = 'Insert into `sessions` (`SessionId`, `UserId`, `Expires`, `UserAgent`, `LastUsed`) VALUES (?, ?, ?, ?, ?);';
        return this._db.query(q, [sessionId, userId, expires, userAgent, now])
        .pipe(
            map(_ => ({SessionId: sessionId, Expires: expires}))
        );
    }

    deactivateSession(userId: string, SessionId: string): Observable<any> {
        return this._db.query('Update `sessions` set `Active`=0 where `SessionId`=? AND `UserId`=?', [SessionId, userId])
        .pipe(
            map(results => results.changedRows > 0)
        );
    }

    updateAccess(SessionId: string): Observable<any> {
        const now = Math.floor(new Date().valueOf()/1000);
        return this._db.query('Update `sessions` SET `LastUsed`=? WHERE `SessionId`=?', [now, SessionId])
        .pipe(
            flatMap(_ => this._db.query('UPDATE `sessions` set `Active`=0 WHERE `Expires` <= ?', [now])) // reap expired sessions
        );
    }
}
