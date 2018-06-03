import {Router} from 'express';
import {createHash} from 'crypto';
import * as uuid from 'uuid/v4';
import {Observable, from, forkJoin, of as ObservableOf} from 'rxjs';
import {flatMap, map} from 'rxjs/operators';
import * as jose from 'node-jose';
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
        if (!body || !body.Email || !body.PrivateKey || !body.PublicKey || !body.Salt  || !body.IV) {
            return res.status(400).send('please verify all required fields are present');
        } else {
            const q = 'Insert into `users` (`Email`, `Salt`, `IV`, `PrivateKey`, `PublicKey`, `Active`) VALUES(?, ?, ?, ?, ?, 1);'
            db.query(q, [body.Email, body.Salt, body.IV, body.PrivateKey, body.PublicKey])
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

    router.post('/login/init', (req, res) => {
        const body = req.body;
        if (!body || !body.Email || !body.Nonce) {
            return res.status(400).send('Email and Nonce are required fields');
        }
        db.query('Select `PrivateKey`, `PublicKey`, `UserId`, `Salt`, `IV` from `users` where `Active`=1 AND `Email`=? LIMIT 1;', [body.Email])
        .pipe(
            flatMap(
                (users: any[]) => {
                    if (users.length < 1) {
                        return Observable.throw('No such known user');
                    }
                    const user =  users[0];
                    const spki = new Buffer(user.PublicKey, 'base64');
                    const tempKeystore = jose.JWK.createKeyStore();
                    const challenge = uuid();
                    const solution = createHash('sha512').update(`${challenge}|${body.Nonce}`).digest('base64');
                    return forkJoin(
                        from<jose.JWK.Key>(jose.JWK.asKey(spki, 'spki')),
                        from<jose.JWK.Key>(tempKeystore.generate(
                            'oct', 
                            256, 
                            {
                                kid: `${user.UserId}-${body.Nonce}`,
                                alg: 'A256GCM',
                                use: 'enc'
                            }
                        )),
                        db.query('Insert into `challenges` (`UserId`, `Solution`, `Nonce`) VALUES (?, ?, ?)', [user.UserId, solution, body.Nonce])
                        .pipe(
                            map(result => ({challengeId: result.insertId, challenge}))
                        ),
                        ObservableOf({PrivateKey: user.PrivateKey, Salt: user.Salt, IV: user.IV})
                    );
                }
            ),
            flatMap(([pubkey, encKey, challengeData, userData]) => {
                return forkJoin(
                    from<any>(jose.JWE.createEncrypt(encKey).update(challengeData.challenge).final()),
                    from<any>(jose.JWE.createEncrypt(pubkey).update(encKey).final()),
                    ObservableOf(challengeData.challengeId),
                    ObservableOf(userData)
                )
            })
        ).subscribe(
            ([challenge, challengeKey, challengeId, userData]) => {
                return res.send({ChallengeId: challengeId, Challenge: challenge, ChallengeKey: challengeKey, ...userData});
            },
            err => {
                if (err === 'No such known user') {
                    return res.status(400).send('No such known user');
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
