import { Component } from '@angular/core';
import { GlbHmsComponent } from './glb-hms/glb-hms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GlbHmsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
