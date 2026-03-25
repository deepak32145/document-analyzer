import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type SnackbarType = 'error' | 'success' | 'info';

export interface SnackbarMessage {
  text: string;
  type: SnackbarType;
}

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private _messages = new Subject<SnackbarMessage>();
  messages$ = this._messages.asObservable();

  show(text: string, type: SnackbarType = 'info') {
    this._messages.next({ text, type });
  }

  error(text: string)   { this.show(text, 'error'); }
  success(text: string) { this.show(text, 'success'); }
  info(text: string)    { this.show(text, 'info'); }
}
