import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { NgbOffcanvas, NgbOffcanvasRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-mobile-context-menu',
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #offcanvasContent>
      <div
        class="mobile-context-menu-content"
        data-testid="mobile-context-menu"
      >
        <div
          class="mobile-context-menu-header d-flex align-items-center justify-content-between p-3 bg-body-tertiary border-bottom gap-2"
        >
          <h2
            id="mobile-context-menu-title"
            class="h5 mb-0 fw-semibold text-body-emphasis d-flex align-items-center gap-2"
          >
            <i class="bi bi-list-check text-primary" aria-hidden="true"></i>
            @if (titleIsTemplate()) {
              <ng-container *ngTemplateOutlet="templateRef()"></ng-container>
            } @else {
              {{ title() }}
            }
          </h2>
          <button
            type="button"
            class="btn-close"
            aria-label="Close actions"
            i18n-aria-label
            (click)="close()"
          ></button>
        </div>
        <ng-content></ng-content>
      </div>
    </ng-template>
  `,
  styleUrl: './mobile-context-menu.component.scss',
})
export class MobileContextMenuComponent {
  private readonly offcanvas = inject(NgbOffcanvas);
  readonly title = input.required<string | TemplateRef<unknown>>();
  protected readonly titleIsTemplate = computed(
    () => this.title() instanceof TemplateRef,
  );
  protected readonly templateRef = computed(() =>
    this.titleIsTemplate() ? (this.title() as TemplateRef<unknown>) : null,
  );
  readonly offcanvasContent =
    viewChild.required<TemplateRef<unknown>>('offcanvasContent');
  private offcanvasRef?: NgbOffcanvasRef;

  open() {
    this.offcanvasRef?.dismiss();
    this.offcanvasRef = this.offcanvas.open(this.offcanvasContent(), {
      position: 'bottom',
      panelClass: 'd-sm-none mobile-context-menu-offcanvas',
      backdropClass: 'd-sm-none',
      scroll: true,
      ariaLabelledBy: 'mobile-context-menu-title',
    });
  }

  close() {
    this.offcanvasRef?.dismiss();
    this.offcanvasRef = undefined;
  }
}
