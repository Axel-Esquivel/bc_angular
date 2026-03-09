import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { PriceListFormComponent } from './components/price-list-form/price-list-form.component';
import { PriceListItemsComponent } from './components/price-list-items/price-list-items.component';
import { PriceListFormPageComponent } from './pages/price-list-form-page/price-list-form-page.component';
import { PriceListsPageComponent } from './pages/price-lists-page/price-lists-page.component';
import { priceListsRoutes } from './price-lists.routes';
import { VariantPickerComponent } from '../../shared/components/variant-picker/variant-picker.component';

@NgModule({
  declarations: [
    PriceListsPageComponent,
    PriceListFormPageComponent,
    PriceListFormComponent,
    PriceListItemsComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(priceListsRoutes),
    AccordionModule,
    AutoCompleteModule,
    ButtonModule,
    DialogModule,
    FloatLabelModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TextareaModule,
    ToolbarModule,
    TooltipModule,
    VariantPickerComponent,
  ],
})
export class PriceListsModule {}
