import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class MaskService {

    constructor(){}

    maskPhone(unmasked: string): string {
        let mask = unmasked.replace(/[^0-9]/g, '');
        // adding chars
        const open = /^([0-9])/;
        mask = mask.replace(open, '($1');
        if (mask.length > 3) {
            const prefix = /^\(?([0-9]{3})\)?/;
            mask = mask.replace(prefix, '($1)');
        }
        if (mask.length > 6) {
            const mid = /^\(([0-9]{3})\)[\. \-]?([0-9])/;
            mask = mask.replace(mid, '($1) $2');
        }
        if (mask.length > 10) {
            const end = /^\(?([0-9]{3})\)?[\. \-]?([0-9]{3})[\. \-]?([0-9]{1,4}).*$/;
            mask = mask.replace(end, '($1) $2 $3');
        }
        return mask;
    }

    maskDate(unmasked: string): string {
        let mask = unmasked.replace(/[^0-9]/g, '');
        // adding chars
        if (mask.length > 2) {
            const month = /^([0-9]{2})[\.\-\s\/\\]?/;
            mask = mask.replace(month, '$1/');
        }
        if (mask.length > 5) {
            const day = /^([0-9]{2})[\.\-\s\/\\]?([0-9]{2})[\.\-\s\/\\]?/;
            mask = mask.replace(day, '$1/$2/');
        }
        if (mask.length > 10) {
            const year = /^([0-9]{2})[\.\-\s\/\\]?([0-9]{2})[\.\-\s\/\\]?([0-9]{4}).*$/;
            mask = mask.replace(year, '$1/$2/$3');
        }
        return mask;
    }
}
