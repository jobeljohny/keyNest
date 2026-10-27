import { Routes } from '@angular/router';
import { VaultPageComponent } from './pages/vault/vault-page.component';

export const routes: Routes = [
  { path: '', component: VaultPageComponent },
  {
    path: 'share/:slug',
    loadComponent: () =>
      import('./pages/shared-credential/shared-credential.component').then(
        (m) => m.SharedCredentialComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
//test comment