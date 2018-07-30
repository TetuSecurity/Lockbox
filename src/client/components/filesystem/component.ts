import {Component, OnInit} from '@angular/core';
import {SubscriberComponent} from '@core/';
import {INode, Directory} from '@models/inode';
import {FilesystemService} from '@services/filesystem/service';

@Component({
    selector: 'filesystem-root',
    templateUrl: './template.html',
    styleUrls: ['./styles.scss']
})
export class FilesystemComponent extends SubscriberComponent implements OnInit {

    isLoading: boolean;
    breadCrumb: string = '/';
    
    currentDir: Directory; // currently viewing a directory full of inodes

    constructor(
        private _filesService: FilesystemService
    ) {
        super();
    }

    ngOnInit(): void {
        this.addSubscription(
            this._filesService.getRootDirectory()
            .subscribe(
                root => this.currentDir = root,
                err => console.error(err)
            )
        );
    }

    createDir(name: string) {
        this.addSubscription(
            this._filesService.addDirectory(this.currentDir.INodeId, name)
            .subscribe(
                dir => {
                    this.currentDir.Children.push(dir);
                },
                err => console.error(err)
            )
        );
    }

    createFile(event: any) {
        if (event && event.target && event.target.files && event.target.files.length) {
            const files: FileList = event.target.files;
            const file = files[0];
            this.addSubscription(
                this._filesService.addFile(this.currentDir.INodeId, file.name, file.type)
                .subscribe(
                    f => {
                        this.currentDir.Children.push(f);
                    },
                    err => console.error(err)
                )
            );
        }
    }
}
