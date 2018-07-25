import {join} from 'path';
import {readFileSync} from 'fs';
import {createServer} from 'http';
import * as cluster from 'cluster';
import * as os from 'os';
import * as spdy from 'spdy';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as compress from 'compression';
import * as express from 'express';
import * as morgan from 'morgan';
import * as dotenv from 'dotenv';
import * as userAgent from 'express-useragent';
import {Config} from './models/config';
import {DatabaseService} from './services/db';
import {SessionManager} from './services/session';
import {LoggingService} from './services/logger';

dotenv.config({silent: true});

const APP_CONFIG: Config = {
    environment: process.env.ENVIRONMENT || 'dev',
    cookie_name: process.env.COOKIE_NAME || '__cookie_name',
    cookie_secret: process.env.COOKIE_SECRET || 'cookie_secret',
    port: (+process.env.NODE_PORT) || 3000,
    log_level: process.env.MORGAN_LOG_LEVEL || 'short',
    client_root: process.env.CLIENT_ROOT || join(__dirname, '../client/'),
    logger: new LoggingService()
};
function tryLoad(filePath: string): any {
    if (!filePath || !filePath.length) {
        return undefined;
    }
    try {
        return readFileSync(filePath);
    } catch (err) {
        console.log('Could not load', filePath);
        return undefined;
    }
}

function forkWorker(): cluster.Worker {
    const worker = cluster.fork();

    worker.on('exit', (code, signal) => {
        console.log(`[ worker ${worker.id} ]: exiting with code {${code}}${ signal ? ` in response to signal {${signal}}`: ''}`);
    });

    worker.on('error', (err) => {
        console.error(`[ worker ${worker.id} ]: ERROR`, err);
    });
    return worker;
}

function changeContentType(res, path, stat) {
    res.set('content-type', 'application/javascript');
}

if (cluster.isMaster) {
    const numCPUs = os.cpus().length;
    const workers: cluster.Worker[] = [];
    console.log('[ master ]: App starting on port', APP_CONFIG.port);
    console.log(`[ master ]: Spinning up ${numCPUs - 1} workers`);
    for (let i=1; i < numCPUs; i++) {
        const worker = forkWorker();
        workers.push(worker);
    }

    cluster.on('listening', (worker) => {
        console.log(`[ worker ${worker.id} ]: Ready and listening!`);
    });

    cluster.on('message', (worker, messages, handle) => {
        console.log(`[ worker ${worker.id} ]:`, ...messages);
    });

    cluster.on('exit', (worker, code, signal) => {
        const deadIndex = workers.findIndex(w => w.id === worker.id);
        if (deadIndex >= 0) {
            workers.splice(deadIndex, 1);
        }
        if (!worker.exitedAfterDisconnect) {
            console.log(`[ master ]: replacing crashed worker ${worker.id}`);
            const newWorker = forkWorker();
            workers.push(newWorker);
        }
    });

    process.on('exit', function () {
        console.log('[ master ]: killing workers');
        workers.forEach((worker) => worker.kill());
    });
    
} else {
    /*-------- Services --------*/
    const db = new DatabaseService();
    APP_CONFIG.db = db;

    const sessionManager = new SessionManager(db);
    APP_CONFIG.sessionManager = sessionManager;


    const app = express();
    app.use(compress());
    app.use(userAgent.express());
    app.use(bodyParser.json({limit: '100mb'}));
    app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
    app.use(cookieParser(APP_CONFIG.cookie_secret));
    app.use(
        morgan(
            APP_CONFIG.log_level,
            {
                stream: APP_CONFIG.logger.logStream
            }
        )
    );

    let server;
    if (process.env.HTTPS) {
        let ssl_config = {
            key: (process.env.SSLKEY ? tryLoad(process.env.SSLKEY) : undefined),
            cert: (process.env.SSLCERT ? tryLoad(process.env.SSLCERT) : undefined),
            ca: (process.env.SSLCHAIN ? tryLoad(process.env.SSLCHAIN) : undefined),
            pfx: (process.env.SSLPFX ? tryLoad(process.env.SSLPFX) : undefined)
        };
        server = spdy.createServer(ssl_config, app);
        let redir = express();
        redir.get('*', (req, res, next) => {
        let httpshost = `https://${req.headers.host}${req.url}`;
        return res.redirect(httpshost);
        });
        redir.listen(80);
    } else {
        server = createServer(app);
    }

    /*-------- API --------*/
    app.use('/api', require('./routes/api')(APP_CONFIG));

    /*------- Angular client on Root ------- */
    app.use('/wb-assets/', express.static(join(APP_CONFIG.client_root, './wb-assets'), {maxAge: 0, setHeaders: changeContentType}));
    app.set('view engine', 'html');
    app.get(/.*\.map$/, (req, res) => {
        return res.status(501).send('no map for you!');
    });
    app.use(express.static(APP_CONFIG.client_root, {maxAge: 0}));
    app.get('/*', function(req, res){
        return res.sendFile(join(APP_CONFIG.client_root, './index.html'));
    });

    app.all('*', function(req, res){
        return res.status(404).send('404 UNKNOWN ROUTE');
    });

    server.listen(APP_CONFIG.port);
}
