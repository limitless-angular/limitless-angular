import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface DraftMode {
  disable: () => Promise<void>;
}

export const injectDraftMode = (): (() => DraftMode) => {
  const http = inject(HttpClient);

  const disable = async () => {
    await firstValueFrom(http.get('/api/draft/disable'));
  };

  const instance: DraftMode = { disable };

  return () => instance;
};
