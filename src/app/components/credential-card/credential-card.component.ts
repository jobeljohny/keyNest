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
import { LucideDynamicIcon } from '@lucide/angular';
import { Credential } from '../../models/credential.model';
import { ToastService } from '../../services/toast.service';
import { ShareCryptoService } from '../../services/share-crypto.service';
import {
  ContextMenuComponent,
  ContextMenuItem,
} from '../context-menu/context-menu.component';

@Component({
  selector: 'app-credential-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContextMenuComponent, LucideDynamicIcon],
  templateUrl: './credential-card.component.html',
  styleUrl: './credential-card.component.scss',
  host: {
    // lift the whole host above sibling cards while a menu is open, so the
    // overflowing panel isn't painted under the next grid item
    '[class.host--menu-open]': 'menuOpen()',
  },
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
  private readonly shareCrypto = inject(ShareCryptoService);

  protected readonly revealed = signal(false);
  protected readonly confirmingDelete = signal(false);
  // true while either menu (options/share) is open, so the card can lift itself
  // above sibling cards — otherwise the overflowing panel paints under them
  protected readonly menuOpen = signal(false);

  protected readonly maskedPassword = computed(() =>
    '•'.repeat(Math.min(this.credential().password.length, 12) || 8),
  );

  protected readonly menuItems: ContextMenuItem[] = [
    { id: 'edit', label: 'Edit', icon: 'pencil' },
    { id: 'delete', label: 'Delete', icon: 'trash-2', danger: true },
  ];

  // Lucide icon name for the footer Share trigger (share-nodes glyph)
  protected readonly shareIconName = 'share-2';

  protected readonly shareMenuItems: ContextMenuItem[] = [
    { id: 'raw', label: 'Copy as text', icon: 'file-text' },
    { id: 'link', label: 'Copy share link', icon: 'link-2' },
  ];

  protected onMenuSelect(id: string): void {
    if (id === 'edit') this.onEdit();
    else if (id === 'delete') this.askDelete();
  }

  protected onShareSelect(id: string): void {
    if (id === 'raw') this.copyRawText();
    else if (id === 'link') void this.copyShareLink();
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

  // existing behavior: copy a human-readable plaintext block
  protected copyRawText(): void {
    const c = this.credential();
    const block = `${c.name}\nusername: ${c.username}\npassword: ${c.password}`;
    if (this.clipboard.copy(block)) {
      this.toast.success('Share text copied');
    } else {
      this.toast.error('Copy failed');
    }
  }

  // new behavior: build an encrypted, self-contained share link and copy it
  protected async copyShareLink(): Promise<void> {
    try {
      const url = await this.shareCrypto.buildShareUrl(this.credential());
      if (this.clipboard.copy(url)) {
        this.toast.success('Share link copied');
      } else {
        this.toast.error('Copy failed');
      }
    } catch {
      this.toast.error('Could not create share link');
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
