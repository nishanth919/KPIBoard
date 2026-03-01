import { Component } from '@angular/core';
import { MockupV1Component } from './plainForm/mockup-v1.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MockupV1Component],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
