import {Router} from 'express';
import {Config} from '../models/config';

module.exports = (APP_CONFIG: Config) => {
    const router = Router();
    const db = APP_CONFIG.db;
    const fileService = APP_CONFIG.fileService;

    router.get('/', (req, res, next) => {
        const userId = res.locals.usersession.UserId;
        if (!userId) {
            return res.status(401).send('Not Authorized to get files');
        }
        fileService.getRoot(userId)
        .subscribe(
            root => {
                return res.send(root);
            }, err => {
                console.error(err);
                return res.status(500).send('There was a problem looking up files');
            }
        )
    });

    router.get('/:inodeid', (req, res, next) => {
        const userId = res.locals.usersession.UserId;
        if (!userId) {
            return res.status(401).send('Not Authorized to get files');
        }
        console.log(userId, req.params.inodeid);
        fileService.getDirectory(userId, req.params.inodeid)
        .subscribe(
            dir => {
                return res.send(dir);
            }, err => {
                console.error(err);
                return res.status(500).send('There was a problem looking up files');
            }
        )
    });

    router.post('/', (req, res, next) => {
        const userId = res.locals.usersession.UserId;
        if (!userId) {
            return res.status(401).send('Not Authorized');
        }
        const body = req.body;
        if (!body || !body.EncryptedName || !body.IV || !body.ParentId || !body.EncryptedKey) {
            return res.status(400).send('Must include EncryptedKey, EncryptedName, IV, and ParentId');
        }
        if (body.IsDirectory) {
            fileService.createDirectory(userId, body)
            .subscribe(
                dir => res.send(dir),
                err => {
                    console.error(err);
                    return res.status(500).send('Could not create directory');
                }
            );
        } else {
            if (!body.MimeType) {
                return res.status(400).send('MimeType is required');
            }
            fileService.createFile(userId, body)
            .subscribe(
                file => res.send(file),
                err => {
                    console.error(err);
                    return res.status(500).send('Could not create file');
                }
            );
        }
    });

    router.post('/contents/:id', (req, res, next) => {
        const userId = res.locals.usersession.UserId;
        if (!userId) {
            return res.status(401).send('Not Authorized');
        }
        const fileId = 
    });
    
    // Return middleware router
    return router;
}
