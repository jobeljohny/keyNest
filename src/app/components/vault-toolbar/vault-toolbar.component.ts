import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-vault-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vault-toolbar.component.html',
  styleUrl: './vault-toolbar.component.scss',
})
export class VaultToolbarComponent {
  readonly query = input('');

  readonly queryChange = output<string>();
  readonly add = output<void>();

  protected onInput(event: Event): void {
    this.queryChange.emit((event.target as HTMLInputElement).value);
  }
}
