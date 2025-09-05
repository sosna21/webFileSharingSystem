import { TestBed } from '@angular/core/testing';

import { FileUploadDragDropService } from './file-upload-drag-drop.service';

describe('FileUploadDragDropService', () => {
  let service: FileUploadDragDropService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileUploadDragDropService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
