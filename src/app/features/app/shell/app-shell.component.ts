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
      label: 'Operación',
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
            label: 'Catálogo',
            items: [{ label: 'Productos', icon: 'pi pi-tags', routerLink: '/app/products' }],
          },
        ],
      ],
    },
    {
      label: 'Configuración',
      items: [
        [
          {
            label: 'Módulos',
            items: [
              {
                label: 'Ajustes',
                icon: 'pi pi-cog',
                routerLink: '/app/settings/modules',
              },
              {
                label: 'Tienda de módulos',
                icon: 'pi pi-shopping-bag',
                routerLink: '/app/modules/store',
                queryParams: { returnUrl: '/app/home' },
              },
            ],
          },
        ],
      ],
    },
  ];
}

