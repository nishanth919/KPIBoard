import { Component, OnInit, signal, computed, HostListener, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare var Highcharts: any;

interface DashboardElement {
  id: string;
  type: 'chart' | 'text';
  visType: 'column' | 'bar' | 'line' | 'pie' | 'donut';
  content: string;
  fontSize: number;
  color: string;
  colSpan: number;
  rowSpan: number;
  title: string;
  order: number;
  drillLevel: number; // 0: Main, 1: Sub, 2: Detail Table
  showTable: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <div class="app-container" (mouseup)="onGlobalMouseUp()">
      <!-- Header -->
      <header class="main-header">
        <div class="header-left">
          <span class="brand-blue">insights</span>
          <span class="brand-dark">Analytics Engine</span>
        </div>
        <div class="header-right">
          <button class="header-btn" (click)="addNewElement('text')">+ ADD TEXT</button>
          <button class="header-btn btn-gold" (click)="addNewElement('chart')">+ ADD NEW CHART</button>
          <span class="material-icons settings-icon">settings</span>
        </div>
      </header>

      <div class="main-layout">
        <!-- Canvas -->
        <main class="canvas-area">
          <div class="grid-container">
            @for (el of sortedElements(); track el.id) {
              <div [id]="el.id"
                   class="widget-card"
                   [class.selected]="selectedId() === el.id"
                   [class.is-dragging]="draggedId === el.id"
                   [style.grid-column]="'span ' + el.colSpan"
                   [style.grid-row]="'span ' + el.rowSpan"
                   (mousedown)="selectElement(el.id)"
                   (mouseenter)="onMouseEnterWidget(el.id)">

                <div class="widget-header drag-handle" (mousedown)="startDrag($event, el)">
                  <span class="widget-title">{{ el.title }}</span>
                  <div class="widget-actions">
                    <span class="action-text edit" (click)="selectElement(el.id)">edit</span>
                    <span class="action-text delete" (click)="removeElement(el.id); $event.stopPropagation()">delete</span>
                  </div>
                </div>

                <div class="widget-body">
                  @if (el.type === 'chart') {
                    <div [id]="'chart-' + el.id" class="chart-container" [style.height]="el.showTable ? '50%' : '100%'"></div>

                    @if (el.showTable) {
                      <div class="detail-panel">
                        <div class="panel-header">
                          <span class="panel-title">Detailed Analysis: {{ el.title }}</span>
                          <button class="back-link" (click)="resetDrilldown(el)">Back to Chart</button>
                        </div>
                        <div class="table-container">
                          <table class="data-table">
                            <thead>
                              <tr>
                                <th>Category</th>
                                <th>Total Amount</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr><td>Category A</td><td>$1,240</td><td><span class="badge success">Completed</span></td></tr>
                              <tr><td>Category B</td><td>$890</td><td><span class="badge warning">Pending</span></td></tr>
                              <tr><td>Category C</td><td>$2,100</td><td><span class="badge success">Completed</span></td></tr>
                              <tr><td>Category D</td><td>$450</td><td><span class="badge info">Review</span></td></tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    }
                  } @else {
                    <div class="text-content" [style.font-size.px]="el.fontSize" [style.color]="el.color">
                      {{ el.content }}
                    </div>
                  }
                  <div class="resize-handle" (mousedown)="startResize($event, el)"></div>
                </div>
              </div>
            }
          </div>
        </main>

        <!-- Sidebar -->
        <aside class="sidebar">
          <div class="sidebar-tabs">
            <button class="tab-btn" [class.active]="activeTab === 'vis'" (click)="activeTab = 'vis'">VISUALIZATIONS</button>
            <button class="tab-btn" [class.active]="activeTab === 'data'" (click)="activeTab = 'data'">DATA FIELDS</button>
          </div>

          <div class="sidebar-content">
            @if (activeTab === 'vis') {
              <div class="tab-pane">
                @if (selectedElement(); as el) {
                  <div class="config-section">
                    <label class="config-label">WIDGET NAME</label>
                    <input type="text" [(ngModel)]="el.title" (ngModelChange)="refreshChart(el)" class="sidebar-input">
                  </div>

                  <div class="config-section">
                    <div class="vis-icon-grid">
                      <div class="vis-icon-box" [class.active]="el.visType === 'column'" (click)="setVisType(el, 'column')">
                        <span class="material-icons">bar_chart</span>
                      </div>
                      <div class="vis-icon-box" [class.active]="el.visType === 'bar'" (click)="setVisType(el, 'bar')">
                        <span class="material-icons">notes</span>
                      </div>
                      <div class="vis-icon-box" [class.active]="el.visType === 'line'" (click)="setVisType(el, 'line')">
                        <span class="material-icons">show_chart</span>
                      </div>
                      <div class="vis-icon-box" [class.active]="el.visType === 'pie'" (click)="setVisType(el, 'pie')">
                        <span class="material-icons">pie_chart</span>
                      </div>
                      <div class="vis-icon-box" [class.active]="el.visType === 'donut'" (click)="setVisType(el, 'donut')">
                        <span class="material-icons">donut_large</span>
                      </div>
                    </div>
                  </div>

                  <div class="config-section">
                    <label class="config-label">LABEL POSITION</label>
                    <div class="segmented-control">
                      <button class="segment">Top</button>
                      <button class="segment active">Btm</button>
                      <button class="segment">Lft</button>
                      <button class="segment">Rgt</button>
                    </div>
                  </div>

                  <div class="drop-zone">
                    <label class="config-label">AXIS (CATEGORY)</label>
                    <div class="drop-box active">Category</div>
                  </div>

                  <div class="drop-zone">
                    <label class="config-label">VALUES</label>
                    <div class="drop-box active flex-between">
                      <span>Total Sales</span>
                      <span class="agg-badge">Sum <span class="material-icons">expand_more</span></span>
                    </div>
                  </div>

                  <button class="delete-widget-btn" (click)="removeElement(el.id)">Delete Widget</button>
                } @else {
                  <div class="empty-state">
                    <span class="material-icons">info_outline</span>
                    <p>Select a widget to see visualization properties.</p>
                  </div>
                }
              </div>
            } @else {
              <div class="tab-pane">
                <div class="config-section">
                   <label class="config-label">DATASET SELECTION</label>
                   <select class="sidebar-input">
                     <option>Invoices</option>
                     <option>Sales & Revenue</option>
                   </select>
                </div>
                <div class="field-search">
                  <span class="material-icons">search</span>
                  <input type="text" placeholder="Search fields...">
                </div>
                <div class="field-list">
                  <div class="field-item"><span class="type-icon blue">abc</span> Invoice ID</div>
                  <div class="field-item"><span class="type-icon blue">abc</span> Customer Name</div>
                  <div class="field-item"><span class="type-icon blue">abc</span> Billing Date</div>
                  <div class="field-item"><span class="type-icon gold">Σ</span> Invoice Amount</div>
                  <div class="field-item"><span class="type-icon gold">Σ</span> Tax Total</div>
                </div>
              </div>
            }
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    :host { --primary-blue: #007bff; --bg-gray: #f4f7f9; --border-color: #e2e8f0; --text-main: #334155; --text-light: #64748b; }
    .app-container { display: flex; flex-direction: column; height: 100vh; background: var(--bg-gray); font-family: 'Inter', sans-serif; overflow: hidden; color: var(--text-main); }

    /* Header */
    .main-header { height: 64px; background: white; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; border-bottom: 1px solid var(--border-color); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .brand-blue { color: var(--primary-blue); font-weight: 700; font-size: 18px; }
    .brand-dark { color: #1e293b; font-weight: 600; font-size: 18px; margin-left: 8px; }
    .header-right { display: flex; align-items: center; gap: 12px; }
    .header-btn { padding: 8px 16px; border: 1px solid var(--border-color); background: white; border-radius: 4px; font-weight: 600; font-size: 12px; cursor: pointer; color: #475569; }
    .btn-gold { background: #f1b500; color: #1e293b; border: none; font-weight: 700; }
    .settings-icon { color: var(--text-light); cursor: pointer; margin-left: 8px; }

    /* Layout */
    .main-layout { display: flex; flex: 1; overflow: hidden; }
    .canvas-area { flex: 1; padding: 24px; overflow-y: auto; }
    .grid-container { display: grid; grid-template-columns: repeat(12, 1fr); grid-auto-rows: 60px; gap: 20px; }

    /* Widget Cards */
    .widget-card { background: white; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; position: relative; overflow: hidden; transition: all 0.2s; }
    .widget-card.selected { border: 2px solid var(--primary-blue); box-shadow: 0 4px 12px rgba(0,123,255,0.1); }
    .widget-header { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; cursor: grab; }
    .widget-title { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .action-text { font-size: 16px; color: #cbd5e1; margin-left: 10px; cursor: pointer; }
    .action-text:hover { color: var(--primary-blue); }
    .action-text.delete:hover { color: #ef4444; }

    .widget-body { flex: 1; position: relative; display: flex; flex-direction: column; }
    .chart-container { width: 100%; transition: height 0.3s ease; }

    /* Detail Table Panel */
    .detail-panel { height: 50%; border-top: 2px solid var(--primary-blue); background: #f8fafc; padding: 16px; overflow-y: auto; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .panel-title { font-weight: 700; font-size: 14px; color: #1e293b; }
    .back-link { color: var(--primary-blue); font-size: 12px; font-weight: 600; cursor: pointer; background: none; border: none; }
    .table-container { background: white; border: 1px solid var(--border-color); border-radius: 4px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .data-table th { text-align: left; padding: 10px; background: #f1f5f9; color: #64748b; font-weight: 600; }
    .data-table td { padding: 10px; border-top: 1px solid #f1f5f9; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; }
    .badge.success { background: #dcfce7; color: #166534; }
    .badge.warning { background: #fef9c3; color: #854d0e; }
    .badge.info { background: #e0f2fe; color: #075985; }

    /* Sidebar */
    .sidebar { width: 340px; background: white; border-left: 1px solid var(--border-color); display: flex; flex-direction: column; }
    .sidebar-tabs { display: flex; border-bottom: 1px solid var(--border-color); height: 48px; }
    .tab-btn { flex: 1; border: none; background: none; font-size: 12px; font-weight: 700; color: var(--text-light); cursor: pointer; border-bottom: 2px solid transparent; }
    .tab-btn.active { color: var(--primary-blue); border-bottom-color: var(--primary-blue); }

    .sidebar-content { flex: 1; overflow-y: auto; padding: 20px; }
    .config-section { margin-bottom: 24px; }
    .config-label { display: block; font-size: 11px; font-weight: 700; color: #94a3b8; margin-bottom: 8px; }
    .sidebar-input { width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px; color: #334155; }

    .vis-icon-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .vis-icon-box { height: 50px; border: 1px solid var(--border-color); border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #94a3b8; transition: all 0.2s; }
    .vis-icon-box .material-icons { font-size: 24px; }
    .vis-icon-box.active { border-color: var(--primary-blue); color: var(--primary-blue); background: #f0f7ff; box-shadow: 0 0 0 1px var(--primary-blue); }

    .segmented-control { display: flex; background: #f1f5f9; padding: 4px; border-radius: 6px; }
    .segment { flex: 1; padding: 6px; border: none; background: none; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; border-radius: 4px; }
    .segment.active { background: white; color: var(--primary-blue); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

    .drop-zone { margin-bottom: 16px; }
    .drop-box { border: 1px dashed #cbd5e1; border-radius: 4px; padding: 12px; font-size: 12px; color: #94a3b8; text-align: center; }
    .drop-box.active { border: 1px solid #bae6fd; background: #f0f9ff; color: var(--primary-blue); text-align: left; font-weight: 600; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .agg-badge { background: var(--primary-blue); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; display: flex; align-items: center; gap: 4px; }
    .agg-badge .material-icons { font-size: 12px; }

    .delete-widget-btn { width: 100%; padding: 12px; border: none; background: #fff1f2; color: #e11d48; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; margin-top: 40px; }

    .field-search { display: flex; align-items: center; border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; margin-bottom: 16px; }
    .field-search input { border: none; outline: none; flex: 1; padding: 6px; font-size: 13px; }
    .field-item { display: flex; align-items: center; padding: 10px; border-radius: 4px; font-size: 13px; color: #475569; cursor: pointer; margin-bottom: 4px; transition: background 0.1s; }
    .field-item:hover { background: #f1f5f9; }
    .type-icon { font-size: 10px; font-weight: 800; width: 20px; display: inline-block; }
    .type-icon.blue { color: var(--primary-blue); }
    .type-icon.gold { color: #f1b500; font-size: 14px; }

    .resize-handle { position: absolute; right: 4px; bottom: 4px; width: 12px; height: 12px; cursor: nwse-resize; opacity: 0.3; }
    .resize-handle:hover { opacity: 1; }
  `]
})
export class App implements OnInit {
  cdr = inject(ChangeDetectorRef);
  elements = signal<DashboardElement[]>([]);
  selectedId = signal<string | null>(null);
  activeTab: 'vis' | 'data' = 'vis';

  draggedId: string | null = null;
  resizingId: string | null = null;
  startMouseX = 0;
  startMouseY = 0;
  startSpanCol = 0;
  startSpanRow = 0;

  sortedElements = computed(() => [...this.elements()].sort((a, b) => a.order - b.order));
  selectedElement = computed(() => this.elements().find(e => e.id === this.selectedId()));

  ngOnInit() {
    this.loadHighcharts();
  }

  loadHighcharts() {
    const loadScript = (src: string) => {
      return new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.head.appendChild(s);
      });
    };

    // Sequential loading is critical for Highcharts modules
    loadScript('https://code.highcharts.com/highcharts.js')
      .then(() => loadScript('https://code.highcharts.com/modules/drilldown.js'))
      .then(() => {
        this.initDefaultDashboard();
        this.cdr.detectChanges();
      })
      .catch(err => {
        console.error('Highcharts load failed:', err);
      });
  }

  initDefaultDashboard() {
    this.addNewElement('chart', { title: 'Sum of Total Sales by Category', colSpan: 6, rowSpan: 8 });
    this.addNewElement('chart', { title: 'Q4 Performance', visType: 'pie', colSpan: 6, rowSpan: 8 });
  }

  addNewElement(type: 'chart' | 'text', overrides: Partial<DashboardElement> = {}) {
    const id = 'el-' + Math.random().toString(36).substr(2, 9);
    const newEl: DashboardElement = {
      id, type, visType: 'column',
      content: 'New content block...', fontSize: 14, color: '#334155',
      colSpan: 4, rowSpan: 6, title: 'Untitled Chart',
      order: this.elements().length, drillLevel: 0, showTable: false,
      ...overrides
    };
    this.elements.update(prev => [...prev, newEl]);
    this.selectElement(id);
    this.refreshChart(newEl);
  }

  selectElement(id: string) {
    this.selectedId.set(id);
    this.activeTab = 'vis';
  }

  setVisType(el: DashboardElement, type: 'column' | 'bar' | 'line' | 'pie' | 'donut') {
    el.visType = type;
    this.refreshChart(el);
  }

  removeElement(id: string) {
    this.elements.update(prev => prev.filter(e => e.id !== id));
    if (this.selectedId() === id) this.selectedId.set(null);
  }

  resetDrilldown(el: DashboardElement) {
    el.showTable = false;
    el.drillLevel = 0;
    this.refreshChart(el);
  }

  refreshChart(el: DashboardElement) {
    if (el.type !== 'chart' || typeof Highcharts === 'undefined' || !Highcharts.chart) return;

    requestAnimationFrame(() => {
      const container = document.getElementById('chart-' + el.id);
      if (!container) return;

      const self = this;
      Highcharts.chart(container, {
        chart: {
          type: el.visType === 'donut' ? 'pie' : el.visType,
          style: { fontFamily: 'Inter, sans-serif' },
          events: {
            drilldown: function(e: any) {
              if (!e.seriesOptions) {
                // Last level reached
                el.showTable = true;
                self.cdr.detectChanges();
              }
            }
          }
        },
        title: { text: '' },
        credits: { enabled: false },
        plotOptions: {
          pie: {
            innerSize: el.visType === 'donut' ? '60%' : '0%',
            dataLabels: { enabled: true, format: '{point.name}: {point.y}' }
          },
          series: {
            borderWidth: 0,
            dataLabels: { enabled: true },
            cursor: 'pointer'
          }
        },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#f43f5e'],
        series: [{
          name: 'Main',
          colorByPoint: true,
          data: [
            { name: 'Hardware', y: 65, drilldown: 'hw' },
            { name: 'Software', y: 35, drilldown: 'sw' }
          ]
        }],
        drilldown: {
          series: [
            { id: 'hw', name: 'Hardware', data: [['Laptops', 40], ['Desktops', 25]] },
            { id: 'sw', name: 'Software', data: [['SaaS', 25], ['Cloud', 10]] }
          ]
        }
      });
    });
  }

  // --- Grid Interactions ---
  startDrag(event: MouseEvent, el: DashboardElement) {
    if ((event.target as HTMLElement).closest('.widget-actions')) return;
    this.draggedId = el.id;
    this.selectElement(el.id);
  }

  onMouseEnterWidget(targetId: string) {
    if (!this.draggedId || this.draggedId === targetId) return;
    const list = [...this.elements()];
    const i1 = list.findIndex(e => e.id === this.draggedId);
    const i2 = list.findIndex(e => e.id === targetId);
    if (i1 === -1 || i2 === -1) return;
    const temp = list[i1].order;
    list[i1].order = list[i2].order;
    list[i2].order = temp;
    this.elements.set(list);
  }

  startResize(event: MouseEvent, el: DashboardElement) {
    event.preventDefault(); event.stopPropagation();
    this.resizingId = el.id;
    this.startMouseX = event.clientX; this.startMouseY = event.clientY;
    this.startSpanCol = el.colSpan; this.startSpanRow = el.rowSpan;
  }

  @HostListener('window:mousemove', ['$event'])
  onGlobalMouseMove(event: MouseEvent) {
    if (!this.resizingId) return;
    const el = this.elements().find(e => e.id === this.resizingId);
    if (!el) return;
    const colChange = Math.round((event.clientX - this.startMouseX) / 80);
    const rowChange = Math.round((event.clientY - this.startMouseY) / 60);
    const newCol = Math.max(2, this.startSpanCol + colChange);
    const newRow = Math.max(2, this.startSpanRow + rowChange);
    if (el.colSpan !== newCol || el.rowSpan !== newRow) {
      el.colSpan = newCol; el.rowSpan = newRow;
      this.elements.update(p => [...p]);
      this.refreshChart(el);
    }
  }

  @HostListener('window:mouseup')
  onGlobalMouseUp() {
    this.draggedId = null;
    this.resizingId = null;
  }
}