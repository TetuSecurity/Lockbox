import {Observable} from 'rxjs';
import {createPool, IPoolConfig, Pool, escape as mysqlEscape, Connection} from 'mysql';

const NUMPERPAGE = 50;

export class DatabaseService {
    private _pool: Pool;

    constructor(config?: IPoolConfig) {
        let poolconfig = Object.assign({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            database: process.env.DB_DATABASE || 'lockbox',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'admin',
            charset: 'utf8mb4' // allow emojis
        }, config || {});

        this._pool = createPool(poolconfig);
    }

    query(q: string, params?: any): Observable<any> {
        return Observable.create(observer => {
            this._pool.getConnection((err, conn) => {
                if (err) {
                    if (conn && conn.release) {
                        conn.release();
                    }
                    return observer.error(err);
                }
                conn.query(q, params || [], (error, result) => {
                    conn.release();
                    if (error) {
                        return observer.error(error);
                    }
                    observer.next(result);
                    observer.complete(result); // rebroadcast on complete for async await
                });
            });
        });
    }

    queryConnection(conn: Connection, q:string, params?:any) {
        return Observable.create(observer => {
            conn.query(q, params || [], (error, result) => {
                conn.release();
                if (error) {
                    return observer.error(error);
                }
                observer.next(result);
                observer.complete(result); // rebroadcast on complete for async await
            });
        });
    }

    commitConnection(conn: Connection): Observable<void> {
        return Observable.create(observer => {
            conn.commit(error => {
                if (error) {
                    return conn.rollback(() => {
                        observer.error(error);
                    });
                }
                observer.next(null);
                observer.complete();
            });
        });
    }

    rollbackConnection(conn: Connection): Observable<void> {
        return Observable.create(observer => {
            conn.rollback(() => {
                observer.next(null);
                observer.complete();
            });
        });
    }

    getConnection(): Observable<Connection> {
        return Observable.create(observer => {
            this._pool.getConnection((err, conn) => {
                if (err) {
                    if (conn && conn.release) {
                        conn.release();
                    }
                    return observer.error(err);
                }
            observer.next(conn);
            observer.complete(conn); // rebroadcast on complete for async await
            });
        });
    }

    escape(value) {
        return mysqlEscape(value);
    }

    generatePageQuery(pageNum: number) {
        // We want to get the 1 more than page length, and hide it locally to decide if there is a next page
        return ` LIMIT ${Math.max(pageNum - 1, 0) * NUMPERPAGE}, ${NUMPERPAGE + 1}`;
    }
}
