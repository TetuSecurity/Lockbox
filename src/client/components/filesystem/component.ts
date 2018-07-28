import {Component, OnInit} from '@angular/core';
import {SubscriberComponent} from '@core/';
import {INode, Directory} from '@models/inode';

@Component({
    selector: 'filesystem-root',
    templateUrl: './template.html',
    styleUrls: ['./styles.scss']
})
export class FilesystemComponent extends SubscriberComponent implements OnInit {

    isLoading: boolean;
    breadCrumb: string = '/';
    
    currentDir: Directory; // currently viewing a directory full of inodes

    constructor() {
        super();
    }

    ngOnInit(): void {
        
    }
}
