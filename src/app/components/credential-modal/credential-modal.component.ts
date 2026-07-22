import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Credential, CredentialInput } from '../../models/credential.model';

@Component({
  selector: 'app-credential-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './credential-modal.component.html',
  styleUrl: './credential-modal.component.scss',
})
export class CredentialModalComponent {
  readonly editing = input<Credential | null>(null); // null = add, otherwise edit

  readonly save = output<CredentialInput>();
  readonly close = output<void>();

  private readonly fb = inject(FormBuilder);

  protected readonly showPassword = signal(false);

  protected readonly form: FormGroup = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    username: ['', [Validators.required, Validators.maxLength(120)]],
    password: ['', [Validators.required]],
  });

  constructor() {
    // repatch the form whenever the target record changes
    effect(() => {
      const record = this.editing();
      this.showPassword.set(false);
      if (record) {
        this.form.reset({
          name: record.name,
          username: record.username,
          password: record.password,
        });
      } else {
        this.form.reset({ name: '', username: '', password: '' });
      }
    });
  }

  protected get isEditing(): boolean {
    return this.editing() !== null;
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit(this.form.getRawValue() as CredentialInput);
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
