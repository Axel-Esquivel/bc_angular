import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-setup-shell',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './setup-shell.component.html',
  styleUrl: './setup-shell.component.scss',
})
export class SetupShellComponent {}
