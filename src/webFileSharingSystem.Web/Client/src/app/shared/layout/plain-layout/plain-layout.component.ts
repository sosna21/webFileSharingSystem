import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NavbarComponent } from "../navbar/navbar.component";
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-plain-layout',
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './plain-layout.component.html',
  styleUrl: './plain-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlainLayoutComponent {

}
