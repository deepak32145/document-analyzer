import { Component } from '@angular/core';
import { BusinessFlow } from '../../shared/business-flow/business-flow';

@Component({
  selector: 'app-vista',
  imports: [BusinessFlow],
  templateUrl: './vista.html',
  styleUrl: './vista.scss',
})
export class Vista {}
