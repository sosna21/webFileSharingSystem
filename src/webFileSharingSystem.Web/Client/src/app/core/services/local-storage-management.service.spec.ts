import { TestBed } from '@angular/core/testing';

import { LocalStorageManagementService } from './local-storage-management.service';

describe('LocalStorageManagementService', () => {
  let service: LocalStorageManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalStorageManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
