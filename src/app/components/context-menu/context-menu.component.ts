import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

/** A single actionable row in the menu. */
export interface ContextMenuItem {
  /** Stable identifier emitted on select. */
  id: string;
  label: string;
  /** SVG path `d` string, drawn in a 24x24 stroked viewBox (matches app icons). */
  iconPath?: string;
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
  templateUrl: './context-menu.component.html',
  styleUrl: './context-menu.component.scss',
})
export class ContextMenuComponent {
  readonly items = input.required<ContextMenuItem[]>();
  /** Accessible label for the trigger button. */
  readonly label = input<string>('Options');
  /** Horizontal edge the panel aligns to. */
  readonly align = input<'start' | 'end'>('end');

  readonly select = output<string>();

  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly open = signal(false);
  protected readonly panelAlign = computed(() => this.align());

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
