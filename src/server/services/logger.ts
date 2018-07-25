import { Writable } from 'stream';
import { isMaster } from 'cluster';
// A simple base logging service.
// To make a custom logger, extends this class and 
// overwrite any applicable methods
export class LoggingService {

    logStream: Writable;

    constructor() {
        this.logStream = new Writable();

        this.logStream.write = (chunk) => {
            if (chunk && chunk.length) {
                this.log(chunk.trim());
            }
            return true
        };
    }

    log(...messages: any[]): void {
        if (isMaster) {
            console.log(...messages);
        } else {
            process.send(messages);
        }
    }

    logError(error: any, preamble?: string): void {
        console.error(`ERROR: ${preamble || ''} ${error}`);
    }
}
