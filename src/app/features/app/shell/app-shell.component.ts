import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MegaMenu } from 'primeng/megamenu';
import { MegaMenuItem } from 'primeng/api';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MegaMenu],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  readonly menuItems: MegaMenuItem[] = [
    {
      label: 'OperaciÃ³n',
      items: [
        [
          {
            label: 'Home',
            items: [{ label: 'Inicio', icon: 'pi pi-home', routerLink: '/app/home' }],
          },
          {
            label: 'Ventas',
            items: [{ label: 'POS', icon: 'pi pi-shopping-cart', routerLink: '/app/pos' }],
          },
        ],
        [
          {
            label: 'Inventario',
            items: [{ label: 'Stock', icon: 'pi pi-box', routerLink: '/app/inventory' }],
          },
          {
            label: 'CatÃ¡logo',
            items: [{ label: 'Productos', icon: 'pi pi-tags', routerLink: '/app/products' }],
          },
        ],
      ],
    },
    {
      label: 'ConfiguraciÃ³n',
      items: [
        [
          {
            label: 'MÃ³dulos',
            items: [
              {
                label: 'Ajustes',
                icon: 'pi pi-cog',
                routerLink: '/app/settings/modules',
              },
            ],
          },
        ],
      ],
    },
  ];
}
