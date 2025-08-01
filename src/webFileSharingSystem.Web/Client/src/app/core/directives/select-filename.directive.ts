import { AfterViewInit, Directive, ElementRef, HostListener, inject, OnInit } from '@angular/core';

@Directive({
  selector: 'input[type="text"][appSelectFilename]',
  host: {
    '(focus)': 'onFocus()'
  }
})
export class SelectFilenameDirective implements OnInit, AfterViewInit {
  private el = inject(ElementRef<HTMLInputElement>);

  ngOnInit() {
    const input = this.el.nativeElement;
    input.focus();
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.onFocus());
  }

  onFocus() {
    const input = this.el.nativeElement;
    const value = input.value;
    const dotIndex = value.lastIndexOf('.');

    if (dotIndex === -1) {
      input.setSelectionRange(0, value.length);
    } else {
      input.setSelectionRange(0, dotIndex);
    }
  }
}
