import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SnackbarService, SnackbarMessage } from '../snackbar';

@Component({
  selector: 'app-snackbar',
  imports: [CommonModule],
  templateUrl: './snackbar.html',
  styleUrl: './snackbar.scss',
})
export class SnackbarComponent implements OnInit, OnDestroy {
  visible   = false;
  message   = '';
  type: 'error' | 'success' | 'info' = 'info';

  private sub!: Subscription;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private svc: SnackbarService) {}

  ngOnInit() {
    this.sub = this.svc.messages$.subscribe((msg: SnackbarMessage) => this.display(msg));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    if (this.timer) clearTimeout(this.timer);
  }

  private display(msg: SnackbarMessage) {
    if (this.timer) clearTimeout(this.timer);
    this.message = msg.text;
    this.type    = msg.type;
    this.visible = true;
    this.timer   = setTimeout(() => { this.visible = false; }, 4000);
  }

  dismiss() {
    this.visible = false;
    if (this.timer) clearTimeout(this.timer);
  }
}
