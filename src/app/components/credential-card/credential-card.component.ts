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
import { ShareCryptoService } from '../../services/share-crypto.service';
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
    { id: 'edit', label: 'Edit', iconPath: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z' },
    {
      id: 'delete',
      label: 'Delete',
      iconPath: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
      danger: true,
    },
  ];

  // SVG path for the footer Share trigger (share-nodes glyph)
  protected readonly shareIconPath =
    'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.6 13.5l6.8 4M15.4 6.5l-6.8 4';

  protected readonly shareMenuItems: ContextMenuItem[] = [
    {
      id: 'raw',
      label: 'Copy as text',
      iconPath: 'M9 9h6M9 13h6M9 17h4M6 3h9l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z',
    },
    {
      id: 'link',
      label: 'Copy share link',
      iconPath:
        'M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    },
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
