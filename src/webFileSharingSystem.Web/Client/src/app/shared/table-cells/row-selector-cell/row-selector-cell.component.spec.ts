import { signal } from '@angular/core';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { FileStatus } from '../../../core/models/base-file.model';
import { SelectionService } from '../../../core/services/selection.service';
import { RowSelectorCellComponent } from './row-selector-cell.component';

describe('RowSelectorCellComponent', () => {
  let fixture: ComponentFixture<RowSelectorCellComponent<any>>;
  let service: SelectionService<any>;

  const createFile = (id: number) => ({
    id,
    parentId: null,
    fileName: `file-${id}`,
    mimeType: null,
    size: 100,
    isDirectory: false,
    fileStatus: FileStatus.Completed,
    progressStatus: null,
    partialFileInfo: null,
    uploadProgress: null,
    createdBy: 1,
    createdByUserName: 'me',
  });

  beforeAll(() => {
    TestBed.initTestEnvironment(
      BrowserDynamicTestingModule,
      platformBrowserDynamicTesting(),
    );
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RowSelectorCellComponent],
      providers: [SelectionService],
    }).compileComponents();

    fixture = TestBed.createComponent(RowSelectorCellComponent<any>);
    service = TestBed.inject(SelectionService);
    service.init(signal([createFile(1), createFile(2)]));
    service.selectedIds.set(new Set());
    service.currentSelectionMode.set(null);
    service.touchMultiSelectionActiveState.set(false);

    fixture.componentRef.setInput('file', createFile(1));
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();
  });

  it('does not render the checkbox when touch multi-selection is inactive', () => {
    expect(
      fixture.nativeElement.querySelector('input[type="checkbox"]'),
    ).toBeNull();
  });

  it('renders a checkbox for each file when touch multi-selection is active', () => {
    service.touchMultiSelectionActiveState.set(true);
    service.selectedIds.set(new Set([1]));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[type="checkbox"]');
    expect(input).not.toBeNull();
    expect(input.checked).toBe(true);
    expect(input.disabled).toBe(true);
  });

  it('updates checkbox state from the existing selection', () => {
    service.touchMultiSelectionActiveState.set(true);
    service.selectedIds.set(new Set([1]));
    fixture.detectChanges();

    let input = fixture.nativeElement.querySelector('input[type="checkbox"]');
    expect(input.checked).toBe(true);

    service.selectedIds.set(new Set());
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input[type="checkbox"]');
    expect(input.checked).toBe(false);
  });

  it('removes the checkbox when touch multi-selection exits', () => {
    service.touchMultiSelectionActiveState.set(true);
    service.selectedIds.set(new Set([1]));
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('input[type="checkbox"]'),
    ).not.toBeNull();

    service.touchMultiSelectionActiveState.set(false);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('input[type="checkbox"]'),
    ).toBeNull();
  });
});
