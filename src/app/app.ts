import { Component } from '@angular/core';
import { DashboardComponent } from './dashboard/dashboard';
import { HmsComponent } from './hms/hms';
import { GlbHmsComponent } from './glb-hms/glb-hms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DashboardComponent, HmsComponent, GlbHmsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
