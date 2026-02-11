import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-module-store-shell',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './module-store-shell.component.html',
  styleUrl: './module-store-shell.component.scss',
})
export class ModuleStoreShellComponent {}
