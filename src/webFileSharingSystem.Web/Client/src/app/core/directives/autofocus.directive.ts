import { Directive, ElementRef, inject, Input } from '@angular/core';

@Directive({
    selector: '[appAutofocus]'
})
export class AutofocusDirective {
    private el = inject(ElementRef<HTMLElement>);


    ngOnInit() {
        this.el.nativeElement.focus();
    }
}
