import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MeasurementUnitsDetailsComponent } from './measurement-units/measurement-units-details.component';
import { MeasurementUnitsMasterComponent } from './measurement-units/measurement-units-master.component';
import { MainMenuComponent } from './main-menu/main-menu.component';
import { ApplicationShellComponent } from './application-shell/application-shell.component';
import { MeasurementUnitsImportComponent } from './measurement-units/measurement-units-import.component';
import { ApplicationPageNotFoundComponent } from './application-page-not-found/application-page-not-found.component';
import { SaveInProgressGuard } from '../data/save-in-progress.guard';

const routes: Routes = [
  {
    path: ':tenantId',
    component: ApplicationShellComponent,
    children: [
      { path: 'measurement-units', component: MeasurementUnitsMasterComponent, canDeactivate: [SaveInProgressGuard] },
      { path: 'measurement-units/import', component: MeasurementUnitsImportComponent, canDeactivate: [SaveInProgressGuard] },
      { path: 'measurement-units/:id', component: MeasurementUnitsDetailsComponent, canDeactivate: [SaveInProgressGuard] },

      { path: 'main-menu', component: MainMenuComponent },
      { path: '', redirectTo: 'main-menu', pathMatch: 'full' },
      { path: '**', component: ApplicationPageNotFoundComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ApplicationRoutingModule { }
