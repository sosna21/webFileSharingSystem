import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FileService } from '../../core/services/file.service';
import { RouterLink } from '@angular/router';
import { Breadcrumb } from '../../core/models/breadcrumb.model';
import { DragDropService } from '../../core/services/drag-drop.service';
import { AccessModeIconComponent } from '../access-mode-icon/access-mode-icon.component';
import { NgTemplateOutlet } from '@angular/common';
import { NgbDropdown, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

interface BreadcrumbLayout {
  pathKey: string;
  visibleIndexes: number[];
  hiddenIndexes: number[];
}

@Component({
  selector: 'app-breadcrumb',
  imports: [
    RouterLink,
    AccessModeIconComponent,
    NgTemplateOutlet,
    NgbDropdownModule,
  ],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
  host: {
    class:
      'd-flex justify-content-between align-items-center p-2 border border-2 rounded-4 mb-3',
    style: 'min-height: 52px;',
    '(window:keydown)': 'onKeydown($event)',
    '(window:pointerdown)': 'onWindowPointerDown($event)',
  },
})
export class BreadcrumbComponent implements AfterViewInit, OnDestroy {
  private readonly dragDropService = inject(DragDropService<Breadcrumb>);
  private readonly fileService = inject(FileService);
  private readonly breadcrumbContainer = viewChild.required<
    ElementRef<HTMLElement>
  >('breadcrumbContainer');
  private readonly measurementContainer = viewChild.required<
    ElementRef<HTMLElement>
  >('measurementContainer');
  private readonly hiddenFoldersDropdown = viewChild<NgbDropdown>(
    'hiddenFoldersDropdown',
  );

  readonly breadCrumbs = this.fileService.breadCrumbs;
  private readonly layout = signal<BreadcrumbLayout | null>(null);
  private resizeObserver?: ResizeObserver;
  private measurementScheduled = false;

  readonly visibleBreadCrumbs = computed(() => {
    const crumbs = this.breadCrumbs();
    const currentLayout = this.layout();
    if (!currentLayout || currentLayout.pathKey !== this.pathKey(crumbs)) {
      return crumbs;
    }

    return currentLayout.visibleIndexes.map((index) => crumbs[index]);
  });

  readonly hiddenBreadCrumbs = computed(() => {
    const crumbs = this.breadCrumbs();
    const currentLayout = this.layout();
    if (!currentLayout || currentLayout.pathKey !== this.pathKey(crumbs)) {
      return [];
    }

    return currentLayout.hiddenIndexes.map((index) => crumbs[index]);
  });

  readonly hasHiddenBreadCrumbs = computed(
    () => this.hiddenBreadCrumbs().length > 0,
  );

  readonly dragOverBreadcrumbId = computed(() =>
    this.dragDropService.hoveredTarget()?.type === 'breadcrumb'
      ? this.dragDropService.hoveredTarget()?.target?.id
      : -1,
  );

  constructor() {
    effect(() => {
      this.breadCrumbs();
      this.scheduleMeasurement();
    });
  }

  ngAfterViewInit() {
    const container = this.breadcrumbContainer().nativeElement;
    this.resizeObserver = new ResizeObserver(() => this.scheduleMeasurement());
    this.resizeObserver.observe(container);
    this.resizeObserver.observe(this.measurementContainer().nativeElement);
    this.scheduleMeasurement();
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  private pathKey(crumbs: Breadcrumb[]) {
    return JSON.stringify(
      crumbs.map(({ id, level, fileName, accessMode }) => ({
        id,
        level,
        fileName,
        accessMode,
      })),
    );
  }

  private scheduleMeasurement() {
    if (this.measurementScheduled) return;
    this.measurementScheduled = true;
    queueMicrotask(() => {
      this.measurementScheduled = false;
      this.measureVisiblePath();
    });
  }

  private measureVisiblePath() {
    const container = this.breadcrumbContainer().nativeElement;
    const measurementContainer = this.measurementContainer().nativeElement;
    const crumbs = this.breadCrumbs();
    const availableWidth = container.clientWidth;
    if (availableWidth <= 0) return;

    const itemElements = Array.from(
      measurementContainer.querySelectorAll<HTMLElement>(
        '[data-breadcrumb-measurement-item]',
      ),
    );
    const ellipsisElement = measurementContainer.querySelector<HTMLElement>(
      '[data-breadcrumb-measurement-ellipsis]',
    );
    if (crumbs.length === 0 || itemElements.length !== crumbs.length) return;

    const widths = itemElements.map(
      (item) => item.getBoundingClientRect().width,
    );
    const ellipsisWidth = ellipsisElement?.getBoundingClientRect().width ?? 0;
    const pathKey = this.pathKey(crumbs);
    const allIndexes = crumbs.map((_, index) => index);
    const allWidth = widths.reduce((total, width) => total + width, 0);

    if (crumbs.length <= 2 || allWidth <= availableWidth) {
      this.layout.set({
        pathKey,
        visibleIndexes: allIndexes,
        hiddenIndexes: [],
      });
      return;
    }

    const visibleIndexes = [0];
    const hiddenIndexes: number[] = [];
    const currentIndex = crumbs.length - 1;
    let usedWidth = widths[0] + widths[currentIndex] + ellipsisWidth;

    for (let index = currentIndex - 1; index > 0; index--) {
      if (usedWidth + widths[index] <= availableWidth) {
        visibleIndexes.push(index);
        usedWidth += widths[index];
      } else {
        for (let hiddenIndex = index; hiddenIndex > 0; hiddenIndex--) {
          hiddenIndexes.push(hiddenIndex);
        }
        break;
      }
    }

    visibleIndexes.push(currentIndex);
    visibleIndexes.sort((a, b) => a - b);
    hiddenIndexes.sort((a, b) => a - b);
    this.layout.set({ pathKey, visibleIndexes, hiddenIndexes });
  }

  selectFolder(folderId: number | null) {
    const targetFolderId = folderId !== null && folderId >= 0 ? folderId : null;
    this.fileService.goToFolder(targetFolderId);
  }

  onDragLeave(event: DragEvent, breadcrumb: Breadcrumb) {
    this.dragDropService.rowDragLeave(event, breadcrumb);
  }

  onDragEnter(event: DragEvent, breadcrumb: Breadcrumb) {
    this.dragDropService.breadcrumbDragEnter(event, breadcrumb);
  }

  onDragOver(event: DragEvent) {
    this.dragDropService.tableDragOver(event);
  }

  async onDrop(event: DragEvent, breadcrumb: Breadcrumb) {
    await this.dragDropService.rowDrop(event);
  }

  selectHiddenFolder(breadcrumb: Breadcrumb, dropdown: NgbDropdown) {
    this.selectFolder(breadcrumb.id);
    dropdown.close();
  }

  onHiddenDropdownDragEnter(event: DragEvent, dropdown: NgbDropdown) {
    event.preventDefault();
    dropdown.open();
  }

  onWindowPointerDown(event: PointerEvent) {
    const dropdown = this.hiddenFoldersDropdown;
    const target = event.target;
    if (
      !dropdown()?.isOpen() ||
      !(target instanceof Node) ||
      this.breadcrumbContainer().nativeElement.contains(target) ||
      (target instanceof Element && target.closest('.breadcrumb-dropdown-menu'))
    ) {
      return;
    }

    dropdown()?.close();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.altKey && event.key === 'ArrowUp') {
      event.preventDefault();
      const crumbs = this.breadCrumbs();
      if (crumbs.length > 1) {
        const parentFolder = crumbs[crumbs.length - 2];
        this.selectFolder(parentFolder.id);
      }
    }
  }
}
