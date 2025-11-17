import { Directive, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: 'ng-template[baseTableCell]'
})
export class BaseTableCellDef {
  @Input('baseTableCell') key!: string;
  constructor(public template: TemplateRef<any>) {}
}
