import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-context-shell',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './context-shell.component.html',
  styleUrl: './context-shell.component.scss',
})
export class ContextShellComponent {}
