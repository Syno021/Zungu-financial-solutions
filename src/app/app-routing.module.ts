import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./pages/auth/auth.module').then( m => m.AuthPageModule)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./pages/dashboard/dashboard.module').then( m => m.DashboardPageModule)
  },
  {
    path: 'facilities',
    loadChildren: () => import('./pages/facilities/facilities.module').then( m => m.FacilitiesPageModule)
  },
  {
    path: 'staff',
    loadChildren: () => import('./pages/staff/staff.module').then( m => m.StaffPageModule)
  },
  {
    path: 'patients',
    loadChildren: () => import('./pages/patients/patients.module').then( m => m.PatientsPageModule)
  },
  {
    path: 'ehr',
    loadChildren: () => import('./pages/ehr/ehr.module').then( m => m.EhrPageModule)
  },
  {
    path: 'inventory',
    loadChildren: () => import('./pages/inventory/inventory.module').then( m => m.InventoryPageModule)
  },
  {
    path: 'room-allocation',
    loadChildren: () => import('./pages/room-allocation/room-allocation.module').then( m => m.RoomAllocationPageModule)
  },
  {
    path: 'analytics',
    loadChildren: () => import('./pages/analytics/analytics.module').then( m => m.AnalyticsPageModule)
  },
  {
    path: 'patient-card',
    loadChildren: () => import('./pages/patient-card/patient-card.module').then( m => m.PatientCardPageModule)
  },
  {
    path: 'portal-patient',
    loadChildren: () => import('./pages/portal-patient/portal-patient.module').then( m => m.PortalPatientPageModule)
  },
  {
    path: 'add-staff',
    loadChildren: () => import('./pages/add-staff/add-staff.module').then( m => m.AddStaffPageModule)
  },
  {
    path: 'add-ehr',
    loadChildren: () => import('./pages/add-ehr/add-ehr.module').then( m => m.AddEhrPageModule)
  },
  {
    path: 'ehr-detail-modal',
    loadChildren: () => import('./pages/ehr-detail-modal/ehr-detail-modal.module').then( m => m.EhrDetailModalPageModule)
  },
  {
    path: 'appointments',
    loadChildren: () => import('./pages/appointments/appointments.module').then( m => m.AppointmentsPageModule)
  },
  {
    path: 'diagnoses',
    loadChildren: () => import('./pages/diagnoses/diagnoses.module').then( m => m.DiagnosesPageModule)
  },
  {
    path: 'pages',
    loadChildren: () => import('./pages/pages.module').then( m => m.PagesPageModule)
  },
  {
    path: 'room-list',
    loadChildren: () => import('./pages/room-list/room-list.module').then( m => m.RoomListPageModule)
  },


 
  

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
