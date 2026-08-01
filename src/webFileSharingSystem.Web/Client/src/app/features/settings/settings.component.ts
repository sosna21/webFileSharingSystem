import { Component } from '@angular/core';
import { BackButtonComponent } from '../../shared/back-button/back-button.component';

@Component({
  selector: 'app-settings',
  imports: [BackButtonComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {}
