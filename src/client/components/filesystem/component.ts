import {Component, OnInit} from '@angular/core';
import {SubscriberComponent} from '@core/';
import {INode, Directory, File} from '@models/inode';
import {FilesystemService} from '@services/filesystem/service';
import {ActivatedRoute, Router} from '@angular/router';
import {finalize} from 'rxjs/operators';

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
        private _filesService: FilesystemService,
        private _route: ActivatedRoute,
        private _router: Router
    ) {
        super();
    }

    ngOnInit(): void {
        this.isLoading = true;
        const snapshot = this._route.snapshot;
        if (snapshot && snapshot.data && snapshot.data && snapshot.data.directory) {
            this.currentDir = snapshot.data.directory;
            this.isLoading = false;
        } else {
            this.addSubscription(
                this._filesService.getRootDirectory()
                .pipe(
                    finalize(() => this.isLoading = false)
                )
                .subscribe(
                    root => this.currentDir = root,
                    err => console.error(err)
                )
            );
        }
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
                this._filesService.addFile(this.currentDir.INodeId, file)
                .subscribe(
                    f => {
                        this.currentDir.Children.push(f);
                    },
                    err => console.error(err)
                )
            );
        }
    }

    routeOrDownload(node: INode) {
        if (node.IsDirectory) {
            this.isLoading = true;
            this.addSubscription(
                this._filesService.getDirectory(node.INodeId)
                .pipe(finalize(() => this.isLoading = false))
                .subscribe(dir => this.currentDir = dir)
            );
        } else {
            this.downloadFile((node as File).FileId);
        }
    }

    routeToParent(nodeId: string) {
        this.isLoading = true;
        this.addSubscription(
            this._filesService.getDirectory(nodeId)
            .pipe(finalize(() => this.isLoading = false))
            .subscribe(dir => this.currentDir = dir)
        );
    }

    downloadFile(fileId: string) {
        console.log('You download it...');
    }
}
