import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '../../../../environments/environment';
import { AppFile, ProgressStatus } from '../../../core/models/file.model';
import { HttpClient } from '@angular/common/http';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [NgbCollapseModule, JsonPipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {

  http = inject(HttpClient);
  files = signal<AppFile[]>([]);
  loadingData: boolean = true;
  itemsPerPage = 15;
  currentPage = 1;
  totalItems!: number;

  ngOnInit(): void {
    this.getFiles('GetAll', null, null);
  }


  getFiles(mode: string, parentId: number | null, searchedPhrase: string | null, callBack?: () => void): void {
    const req = `${environment.apiUrl}/File/${mode}?PageNumber=${this.currentPage}&PageSize=${this.itemsPerPage}
      ${parentId ? '&ParentId=' + parentId : ''}${(searchedPhrase && searchedPhrase !== '') ? '&SearchedPhrase=' + searchedPhrase : ''}`;
    this.http.get<any>(`${environment.apiUrl}/File/${mode}?PageNumber=${this.currentPage}&PageSize=${this.itemsPerPage}
      ${parentId ? '&ParentId=' + parentId : ''}${(searchedPhrase && searchedPhrase !== '') ? '&SearchedPhrase=' + searchedPhrase : ''}`)
      .subscribe(response => {
        this.loadingData = false;
        this.totalItems = response.totalCount;
        const files = response.items;
        files.forEach((x: AppFile) => x.progressStatus = ProgressStatus.Stopped);
        this.files.set(files);
        callBack?.();
      }, error => {
        this.loadingData = false;
      })
  }
}
