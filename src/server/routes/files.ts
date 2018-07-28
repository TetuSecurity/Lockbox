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
    
    // Return middleware router
    return router;
}
