import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

/** A single actionable row in the menu. */
export interface ContextMenuItem {
  /** Stable identifier emitted on select. */
  id: string;
  label: string;
  /** Lucide icon name (lower-kebab-case, e.g. `pencil`, `trash-2`). */
  icon?: string;
  /** Renders the row in the danger color and highlights it on hover. */
  danger?: boolean;
  /** Greys out and blocks selection. */
  disabled?: boolean;
}

/**
 * Reusable kebab (⋮) options menu. Supply `items`; listen to `select` for the
 * chosen item's id. Closes on outside click, Escape, or after a selection.
 */
@Component({
  selector: 'app-context-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideDynamicIcon],
  templateUrl: './context-menu.component.html',
  styleUrl: './context-menu.component.scss',
})
export class ContextMenuComponent {
  readonly items = input.required<ContextMenuItem[]>();
  /** Accessible label for the trigger button. */
  readonly label = input<string>('Options');
  /** Horizontal edge the panel aligns to. */
  readonly align = input<'start' | 'end'>('end');
  /**
   * Trigger appearance. `kebab` (default) is the ⋮ icon button; `action`
   * renders a footer-style button with `triggerIcon` + `triggerLabel` text so
   * the menu can sit inline with the card's other footer actions.
   */
  readonly variant = input<'kebab' | 'action'>('kebab');
  /** Lucide icon name for the `action` trigger's icon (lower-kebab-case). */
  readonly triggerIcon = input<string>('');
  /** Visible text for the `action` trigger. */
  readonly triggerLabel = input<string>('');

  readonly select = output<string>();
  /** Emits whenever the panel opens/closes, so a parent can lift its stacking. */
  readonly openChange = output<boolean>();

  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly open = signal(false);
  protected readonly panelAlign = computed(() => this.align());

  constructor() {
    // mirror open-state to the parent regardless of how it changed
    effect(() => this.openChange.emit(this.open()));
  }

  protected toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  protected onItemClick(item: ContextMenuItem, event: MouseEvent): void {
    event.stopPropagation();
    if (item.disabled) return;
    this.select.emit(item.id);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.open.set(false);
  }
}
