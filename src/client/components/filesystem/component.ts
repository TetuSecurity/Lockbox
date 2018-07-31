import {Component, OnInit} from '@angular/core';
import {SubscriberComponent} from '@core/';
import {INode, Directory, File} from '@models/inode';
import {FilesystemService} from '@services/filesystem/service';
import {ActivatedRoute, Router} from '@angular/router';

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
        const id = this._route.snapshot.paramMap.get('id');
        if (id) {
            this.addSubscription(
                this._filesService.getDirectory(id)
                .subscribe(
                    dir => this.currentDir = dir,
                    err => console.error(err)
                )
            );
        } else {
            this.addSubscription(
                this._filesService.getRootDirectory()
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

    routeOrDownload(node: INode) {
        if (node.IsDirectory) {
            this._router.navigate(['/files', node.INodeId]);
        } else {
            this.downloadFile((node as File).FileId);
        }
    }

    downloadFile(fileId: string) {
        console.log('You download it...');
    }
}
