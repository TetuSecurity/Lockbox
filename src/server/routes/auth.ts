import {Router} from 'express';
import {createHash} from 'crypto';
import * as uuid from 'uuid/v4';
import {Observable, from, forkJoin, of as ObservableOf} from 'rxjs';
import {flatMap, map} from 'rxjs/operators';
import {Config} from '../models/config';

const COOKIE_OPTIONS = {
    path: '/',
    httpOnly: true,
    signed: true,
    sameSite: true,
};

module.exports = (APP_CONFIG: Config) => {
    const router = Router();
    const db = APP_CONFIG.db;
    const sessionManager = APP_CONFIG.sessionManager;

    router.post('/signup', (req, res) => {
        const body = req.body;
        if (!body || !body.Email || !body.PrivateKey || !body.PublicKey || !body.Salt  || !body.IV || !body.Password) {
            return res.status(400).send('please verify all required fields are present');
        } else {
            const passSalt = uuid();
            const passHash = createHash('sha512').update(`${body.Password}|${passSalt}`).digest('base64');
            const q = 'Insert into `users` (`Email`, `Salt`, `IV`, `PrivateKey`, `PublicKey`, `Password`, `Active`) VALUES(?, ?, ?, ?, ?, ?, 1);'
            db.query(q, [body.Email, body.Salt, body.IV, body.PrivateKey, body.PublicKey, `${passHash}|${passSalt}`])
            .pipe(
                flatMap(result => sessionManager.createSession(result.insertId, JSON.stringify(res.useragent)))
            )
            .subscribe(
                result => {
                    res.cookie(APP_CONFIG.cookie_name, result.SessionKey, {...COOKIE_OPTIONS, expires: new Date(result.Expires * 1000), secure: req.secure});
                    return res.send();
                },
                err => {
                    console.error(err);
                    res.status(400).send('Could not complete signup');
                }
            );
        }
    });

    router.post('/login', (req, res) => {
        const body = req.body;
        if (!body || !body.Email || !body.Password) {
            return res.status(400).send('Email and Password are required fields');
        }
        db.query('Select `Password`, `PrivateKey`, `UserId`, `Salt`, `IV` from `users` where `Active`=1 AND `Email`=? LIMIT 1;', [body.Email])
        .pipe(
            flatMap(
                (users: any[]) => {
                    let user = {UserId: -100, Password: '12345|12345', Salt: '1', IV: '1', PrivateKey: '1'}; // use a fake user which will fail to avoid timing differences indicating existence of real users.
                    if (users.length > 0) {
                            user = users[0]
                    }
                    const [passHash, passSalt] = user.Password.split('|');
                    const compare = createHash('sha512').update(`${body.Password}|${passSalt}`).digest('base64');
                    if (compare !== passHash) {
                        return Observable.throw('Incorrect Username or Password');
                    }
                    return forkJoin(
                        sessionManager.createSession(user.UserId, JSON.stringify(res.useragent)),
                        ObservableOf({PrivateKey: user.PrivateKey, Salt: user.Salt, IV: user.IV})
                    );
                }
            )       
        ).subscribe(
            ([session, userData]) => {
                res.cookie(APP_CONFIG.cookie_name, session.SessionKey, {...COOKIE_OPTIONS, expires: new Date(session.Expires * 1000), secure: req.secure});
                return res.send(userData);
            },
            err => {
                if (err === 'Incorrect Username or Password') {
                    return res.status(400).send('Incorrect Username or Password');
                } else {
                    console.error(err);
                    return res.status(500).send('Could not initiate login at this time');
                }
            }
        )
    });

    router.get('/valid', (req, res) => {
        return res.send(!!res.locals.usersession);
    });

    router.get('/sessions', (req, res) => {
        if (!res.locals.usersession || !res.locals.usersession.UserId) {
            return res.send([]);
        }
        sessionManager.getActiveSessions(res.locals.usersession.UserId)
        .subscribe(
            sessions => res.send(sessions),
            err => {
                console.error(err);
                res.status(500).send('Cannot fetch active sessions');
            }
        )
    });

    router.delete('/sessions/:sessionKey', (req, res) => {
        const sessionKey = req.params['sessionKey'];
        if (res.locals.usersession && res.locals.usersession.UserId && res.locals.usersession.SessionKey) {
            sessionManager.deactivateSession(res.locals.usersession.UserId, sessionKey)
            .subscribe(
                success => {
                    if (success) {
                        if (res.locals.usersession.SessionKey === sessionKey) {
                            res.clearCookie(APP_CONFIG.cookie_name, {...COOKIE_OPTIONS, secure: req.secure});
                        }
                        return res.send(success);
                    } else {
                        return res.status(400).send('Could not find that session');
                    }
                }  
            )
        }
    });

    router.post('/logout', (req, res) => {
        if (res.locals.usersession && res.locals.usersession.SessionKey && res.locals.usersession.UserId) {
            res.clearCookie(APP_CONFIG.cookie_name, {...COOKIE_OPTIONS, secure: req.secure});
            sessionManager.deactivateSession(res.locals.usersession.UserId, res.locals.usersession.SessionKey)
            .subscribe(
                _ => res.send(true),
                err => {
                    console.error(err);
                    res.send(true);
                }
            );
        } else {
           return res.send(false);
        }
    });

    return router;
}
