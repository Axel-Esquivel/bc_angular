import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly title = signal('business-control');

  constructor(private readonly theme: ThemeService) {}

  ngOnInit(): void {
    this.theme.initTheme();
  }

  toggleTheme(): void {
    this.theme.toggleTheme();
  }
}
