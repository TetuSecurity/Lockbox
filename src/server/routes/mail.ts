import {Router} from 'express';
import {Config} from '../models/config';

module.exports = (APP_CONFIG: Config) => {
    const router = Router();
    const db = APP_CONFIG.db;

    router.post('/keys/search', (req, res, next) => {
        const body = req.body;
        if (!body || !body.Email) {
            return res.status(400).send('Need email to search for');
        }
        db.query('Select `PublicKey` from `users` where `Email`=? LIMIT 1;', [body.Email])
        .subscribe(
            results => {
                if (!results || results.length < 1) {
                    return res.status(400).send('Could not find key');
                } else {
                    const key = results[0];
                    return res.send({Address: body.Email, Key: key.PublicKey});
                }
            }
        )
    });

    router.post('/send/:address', (req, res, next) => {
        const address = req.params.address;
        const body = req.body;
        if (!body || !body.Message) {
            return res.status(400).send('Message is required');
        }
        console.log(body.Message);
        // save message to mailbox, notify recipient?
        return res.send();
    });

    // Return middleware router
    return router;
}
