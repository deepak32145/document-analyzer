import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusinessFlow } from '../../shared/business-flow/business-flow';

type RelayView = 'onboarding' | 'login' | 'flow';

@Component({
  selector: 'app-relay',
  imports: [CommonModule, FormsModule, BusinessFlow],
  templateUrl: './relay.html',
  styleUrl: './relay.scss',
})
export class Relay {
  view: RelayView = 'onboarding';

  // Login screen state
  username = '';
  password = '';
  loginError = '';
  showSpinner = false;

  startLogin() {
    this.showSpinner = true;
    setTimeout(() => {
      this.showSpinner = false;
      this.view = 'login';
      this.username = '';
      this.password = '';
      this.loginError = '';
    }, 1800);
  }

  submitLogin() {
    if (this.username === 'username' && this.password === 'password') {
      this.showSpinner = true;
      setTimeout(() => {
        this.showSpinner = false;
        this.view = 'flow';
      }, 1500);
    } else {
      this.loginError = 'Invalid username or password. Please try again.';
    }
  }
}
