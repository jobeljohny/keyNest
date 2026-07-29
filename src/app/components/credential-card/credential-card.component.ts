import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { Credential } from '../../models/credential.model';
import { ToastService } from '../../services/toast.service';
import {
  ContextMenuComponent,
  ContextMenuItem,
} from '../context-menu/context-menu.component';

@Component({
  selector: 'app-credential-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContextMenuComponent],
  templateUrl: './credential-card.component.html',
  styleUrl: './credential-card.component.scss',
})
export class CredentialCardComponent {
  readonly credential = input.required<Credential>();
  readonly selected = input<boolean>(false);
  readonly selectionActive = input<boolean>(false);

  readonly edit = output<Credential>();
  readonly remove = output<Credential>();
  readonly toggleSelect = output<Credential>();

  private readonly clipboard = inject(Clipboard);
  private readonly toast = inject(ToastService);

  protected readonly revealed = signal(false);
  protected readonly confirmingDelete = signal(false);

  protected readonly maskedPassword = computed(() =>
    '•'.repeat(Math.min(this.credential().password.length, 12) || 8),
  );

  protected readonly menuItems: ContextMenuItem[] = [
    { id: 'edit', label: 'Edit', iconPath: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z' },
    {
      id: 'delete',
      label: 'Delete',
      iconPath: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
      danger: true,
    },
  ];

  protected onMenuSelect(id: string): void {
    if (id === 'edit') this.onEdit();
    else if (id === 'delete') this.askDelete();
  }

  protected toggleReveal(): void {
    this.revealed.update((v) => !v);
  }

  protected copy(field: 'username' | 'password'): void {
    const value = this.credential()[field];
    if (this.clipboard.copy(value)) {
      const label = field === 'username' ? 'Username' : 'Password';
      this.toast.success(`${label} copied`);
    } else {
      this.toast.error('Copy failed');
    }
  }

  protected share(): void {
    const c = this.credential();
    const block = `${c.name}\nusername: ${c.username}\npassword: ${c.password}`;
    if (this.clipboard.copy(block)) {
      this.toast.success('Share text copied');
    } else {
      this.toast.error('Copy failed');
    }
  }

  protected onEdit(): void {
    this.edit.emit(this.credential());
  }

  protected onToggleSelect(): void {
    this.toggleSelect.emit(this.credential());
  }

  protected askDelete(): void {
    this.confirmingDelete.set(true);
  }

  protected cancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  protected confirmDelete(): void {
    this.confirmingDelete.set(false);
    this.remove.emit(this.credential());
  }
}
