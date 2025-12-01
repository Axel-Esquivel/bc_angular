import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly title = signal('business-control');

  constructor(private readonly theme: ThemeService) {}

  toggleTheme(): void {
    this.theme.toggle();
  }
}
