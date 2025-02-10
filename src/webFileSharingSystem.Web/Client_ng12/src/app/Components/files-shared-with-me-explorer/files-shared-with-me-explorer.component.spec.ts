import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilesSharedWithMeExplorerComponent } from './files-shared-with-me-explorer.component';

describe('FilesSharedWithMeExplorerComponent', () => {
  let component: FilesSharedWithMeExplorerComponent;
  let fixture: ComponentFixture<FilesSharedWithMeExplorerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FilesSharedWithMeExplorerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilesSharedWithMeExplorerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
