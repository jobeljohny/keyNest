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

@Component({
  selector: 'app-credential-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credential-card.component.html',
  styleUrl: './credential-card.component.scss',
})
export class CredentialCardComponent {
  readonly credential = input.required<Credential>();

  readonly edit = output<Credential>();
  readonly remove = output<Credential>();

  private readonly clipboard = inject(Clipboard);
  private readonly toast = inject(ToastService);

  protected readonly revealed = signal(false);
  protected readonly confirmingDelete = signal(false);

  protected readonly maskedPassword = computed(() =>
    '•'.repeat(Math.min(this.credential().password.length, 12) || 8),
  );

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
