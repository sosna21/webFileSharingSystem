import { Component, inject, input } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-back-button',
  template: `
    <button
      type="button"
      class="btn btn-outline-primary shadow-sm fw-medium px-3"
      (click)="backClicked()"
    >
      <i class="bi bi-arrow-left me-2"></i> {{ text() }}
    </button>
  `,
})
export class BackButtonComponent {
  private readonly location = inject(Location);

  readonly text = input($localize`Back`);

  backClicked() {
    this.location.back();
  }
}
