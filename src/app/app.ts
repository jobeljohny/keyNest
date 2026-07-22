import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CredentialCardComponent } from './components/credential-card/credential-card.component';
import { CredentialModalComponent } from './components/credential-modal/credential-modal.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { ToastComponent } from './components/toast/toast.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { VaultToolbarComponent } from './components/vault-toolbar/vault-toolbar.component';
import { Credential, CredentialInput } from './models/credential.model';
import { ToastService } from './services/toast.service';
import { VaultService } from './services/vault.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TopbarComponent,
    VaultToolbarComponent,
    CredentialCardComponent,
    CredentialModalComponent,
    EmptyStateComponent,
    ToastComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly vault = inject(VaultService);
  private readonly toast = inject(ToastService);

  protected readonly credentials = signal<Credential[]>([]);
  protected readonly query = signal('');

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Credential | null>(null); // null = adding

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.credentials();
    if (!q) return all;
    return all.filter(
      (c) => c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q),
    );
  });

  protected readonly hasAny = computed(() => this.credentials().length > 0);

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  private async reload(): Promise<void> {
    this.credentials.set(await this.vault.getAll());
  }

  protected openAdd(): void {
    this.editing.set(null);
    this.modalOpen.set(true);
  }

  protected openEdit(credential: Credential): void {
    this.editing.set(credential);
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
    this.editing.set(null);
  }

  protected async onSave(input: CredentialInput): Promise<void> {
    const editing = this.editing();
    if (editing?.id != null) {
      await this.vault.update(editing.id, input);
      this.toast.success('Credential updated');
    } else {
      await this.vault.add(input);
      this.toast.success('Credential added');
    }
    this.closeModal();
    await this.reload();
  }

  protected async onDelete(credential: Credential): Promise<void> {
    if (credential.id == null) return;
    await this.vault.remove(credential.id);
    this.toast.info('Credential deleted');
    await this.reload();
  }

  protected async exportVault(): Promise<void> {
    const backup = await this.vault.exportBackup();
    if (backup.credentials.length === 0) {
      this.toast.info('Nothing to export yet');
      return;
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'keynest-backup.json';
    anchor.click();
    URL.revokeObjectURL(url);
    this.toast.success(`Exported ${backup.credentials.length} credential(s)`);
  }

  protected async onImportFile(file: File): Promise<void> {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const count = await this.vault.importBackup(parsed);
      await this.reload();
      this.toast.success(`Imported ${count} credential(s)`);
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Could not import that file');
    }
  }
}
