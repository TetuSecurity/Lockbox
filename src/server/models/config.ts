import {DatabaseService} from '../services/db';
import {SessionManager} from '../services/session';
import {LoggingService} from '../services/logger';
import {FileService} from '../services/files';

export interface Config {
    environment: string;
    cookie_name: string;
    cookie_secret: string;
    port: number;
    log_level: string;
    client_root: string;
    db?: DatabaseService,
    sessionManager?: SessionManager
    fileService?: FileService;
    logger?: LoggingService
}
