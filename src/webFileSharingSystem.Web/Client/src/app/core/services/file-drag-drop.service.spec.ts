import { TestBed } from '@angular/core/testing';

import { FileDragDropService } from './file-drag-drop.service';

describe('FileDragDropService', () => {
  let service: FileDragDropService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileDragDropService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
