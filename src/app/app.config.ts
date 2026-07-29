import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideLucideIcons,
  LucideCheck,
  LucideEyeOff,
  LucideEye,
  LucideCopy,
  LucideLock,
  LucideMoreVertical,
  LucideX,
  LucideDownload,
  LucideUpload,
  LucideTrash2,
  LucideSearch,
  LucidePlus,
  LucidePencil,
  LucideShare2,
  LucideFileText,
  LucideLink2,
} from '@lucide/angular';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // register every Lucide icon used across the app so components can render
    // them dynamically by name (lower-kebab-case) via `<svg lucideIcon="…">`.
    // provideLucideIcons takes a spread of icon values and keys each by its
    // canonical name (e.g. LucideEyeOff -> "eye-off").
    provideLucideIcons(
      LucideCheck,
      LucideEyeOff,
      LucideEye,
      LucideCopy,
      LucideLock,
      LucideMoreVertical,
      LucideX,
      LucideDownload,
      LucideUpload,
      LucideTrash2,
      LucideSearch,
      LucidePlus,
      LucidePencil,
      LucideShare2,
      LucideFileText,
      LucideLink2,
    ),
  ],
};
