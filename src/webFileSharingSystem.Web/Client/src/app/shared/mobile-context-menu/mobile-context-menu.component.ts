import {
  Component,
  inject,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { NgbOffcanvas, NgbOffcanvasRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-mobile-context-menu',
  imports: [],
  template: `
    <ng-template #offcanvasContent>
      <div
        class="mobile-context-menu-content"
        data-testid="mobile-context-menu"
      >
        <div
          class="mobile-context-menu-header d-flex align-items-center justify-content-between p-3 bg-body-tertiary border-bottom"
        >
          <h2
            id="mobile-context-menu-title"
            class="h5 mb-0 fw-semibold text-body-emphasis d-flex align-items-center"
          >
            <i
              class="bi bi-list-check me-2 text-primary"
              aria-hidden="true"
            ></i>
            {{ title() }}
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
  readonly title = input.required<string>();
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
