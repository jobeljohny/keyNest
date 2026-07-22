import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  output,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  readonly export = output<void>();
  readonly importFile = output<File>();

  private readonly importInput = viewChild<ElementRef<HTMLInputElement>>('importInput');

  protected triggerImport(): void {
    this.importInput()?.nativeElement.click();
  }

  protected onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.importFile.emit(file);
    }
    // reset so picking the same file again still fires change
    input.value = '';
  }
}
