import {Observable} from 'rxjs';

export interface IStorageService {
    storeFile(fileId: string, contents: any): Observable<string>; // saves a file and returns the location
    getFile(location: string): Observable<any>; // returns the contents of a saved file
}
