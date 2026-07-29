import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Clipboard } from '@angular/cdk/clipboard';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { ShareSecret, ShareCryptoService, UnsupportedVersionError } from '../../services/share-crypto.service';
import { ToastService } from '../../services/toast.service';
import { VaultService } from '../../services/vault.service';

@Component({
  selector: 'app-shared-credential',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, EmptyStateComponent],
  templateUrl: './shared-credential.component.html',
  styleUrl: './shared-credential.component.scss',
})
export class SharedCredentialComponent {
  private readonly shareCrypto = inject(ShareCryptoService);
  private readonly vault = inject(VaultService);
  private readonly toast = inject(ToastService);
  private readonly clipboard = inject(Clipboard);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // the encrypted payload rides in the URL fragment; the (display-only) name
  // rides in the :slug route param. Track both reactively so a reused component
  // (router navigating between /share links) still refreshes.
  private readonly fragment = toSignal(this.route.fragment, { initialValue: null });
  private readonly slug = toSignal(this.route.paramMap, { initialValue: null });

  /** Decrypted secret (username + password), or null while in an error state. */
  protected readonly shared = signal<ShareSecret | null>(null);
  /** Friendly error message when the link can't be opened. */
  protected readonly error = signal<string | null>(null);
  protected readonly revealed = signal(false);
  protected readonly saving = signal(false);

  // same rules the add/edit modal enforces for a name
  protected readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(80)],
  });

  protected readonly maskedPassword = computed(() => {
    const pw = this.shared()?.password ?? '';
    return '•'.repeat(Math.min(pw.length, 12) || 8);
  });

  constructor() {
    effect(() => void this.load(this.fragment(), this.slug()?.get('slug') ?? null));
  }

  private async load(raw: string | null, slug: string | null): Promise<void> {
    // reset per-attempt state so a fragment change doesn't show stale results
    this.shared.set(null);
    this.error.set(null);
    this.revealed.set(false);

    if (!raw) {
      this.error.set('This link has no credential in it.');
      return;
    }

    try {
      const bytes = this.shareCrypto.base64UrlDecode(raw);
      const secret = await this.shareCrypto.decryptSecret(bytes);
      this.shared.set(secret);
      // name comes from the slug (display only); the recipient can edit it
      this.nameControl.setValue(this.nameFromSlug(slug));
    } catch (err) {
      this.error.set(this.messageFor(err));
    }
  }

  // turn "github-work" back into a friendly, editable default name "Github Work"
  private nameFromSlug(slug: string | null): string {
    if (!slug) return '';
    return slug
      .split('-')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private messageFor(err: unknown): string {
    if (err instanceof UnsupportedVersionError) {
      return 'This link was created by an incompatible version of KeyNest.';
    }
    // SharePayloadError (malformed/invalid base64) and DecryptionError both land here
    return 'This share link is invalid or has been corrupted.';
  }

  protected toggleReveal(): void {
    this.revealed.update((v) => !v);
  }

  protected copy(field: 'username' | 'password'): void {
    const value = this.shared()?.[field];
    if (value == null) return;
    if (this.clipboard.copy(value)) {
      const label = field === 'username' ? 'Username' : 'Password';
      this.toast.success(`${label} copied`);
    } else {
      this.toast.error('Copy failed');
    }
  }

  protected async save(): Promise<void> {
    const secret = this.shared();
    if (!secret) return;

    if (this.nameControl.invalid) {
      this.nameControl.markAsTouched();
      return;
    }

    this.saving.set(true);
    try {
      // preserve username/password exactly; only the name is user-editable
      await this.vault.add({
        name: this.nameControl.getRawValue().trim(),
        username: secret.username,
        password: secret.password,
      });
      this.toast.success('Saved to vault');
      await this.router.navigate(['']);
    } catch (err) {
      // duplicate name (or storage error) — stay on the page so the user can rename
      this.toast.error(err instanceof Error ? err.message : 'Could not save credential');
      this.saving.set(false);
    }
  }
}
