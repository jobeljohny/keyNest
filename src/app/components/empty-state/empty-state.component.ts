import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

// used for both the empty-vault and no-search-results states
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly icon = input('🪺');
  readonly title = input.required<string>();
  readonly body = input('');
  readonly actionLabel = input<string | null>(null); // omit to hide the button

  readonly action = output<void>();
}
