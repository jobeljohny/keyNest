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
import { Credential, CredentialInput, KeyNestBackup } from './models/credential.model';
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

  // multi-select — ids of currently selected credentials
  protected readonly selectedIds = signal<Set<number>>(new Set());
  protected readonly selectionMode = computed(() => this.selectedIds().size > 0);
  protected readonly selectedCount = computed(() => this.selectedIds().size);

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
    this.downloadBackup(backup, 'keynest-backup.json');
    this.toast.success(`Exported ${backup.credentials.length} credential(s)`);
  }

  // ---- multi-select ----

  protected toggleSelect(credential: Credential): void {
    if (credential.id == null) return;
    const id = credential.id;
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  protected async deleteSelected(): Promise<void> {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;
    await Promise.all(ids.map((id) => this.vault.remove(id)));
    this.clearSelection();
    await this.reload();
    this.toast.info(`Deleted ${ids.length} credential(s)`);
  }

  protected exportSelected(): void {
    const ids = this.selectedIds();
    const chosen = this.credentials().filter((c) => c.id != null && ids.has(c.id));
    if (chosen.length === 0) return;
    const backup: KeyNestBackup = {
      app: 'keynest',
      version: 1,
      exportedAt: new Date().toISOString(),
      credentials: chosen,
    };
    this.downloadBackup(backup, 'keynest-selected.json');
    this.toast.success(`Exported ${chosen.length} credential(s)`);
    this.clearSelection();
  }

  private downloadBackup(backup: KeyNestBackup, filename: string): void {
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
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
