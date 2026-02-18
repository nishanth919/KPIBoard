import { Component, OnInit, signal, computed, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import Highcharts from 'highcharts';
import { ChartPersistenceService, type ChartPostPayload } from './services/chart-persistence.service';

interface Field {
  id: string;
  name: string;
  type: 'dimension' | 'measure';
}

interface DashboardElement {
  id: string;
  type: 'chart' | 'text';
  visType: string;
  dataset: 'Invoices' | 'Sales' | 'Transactions';
  xAxis: Field | null;
  yAxis: Field | null;
  yAxes: Field[];
  legend: Field | null;
  drillDownField: Field | null;
  columnsField: Field | null;
  yAgg: 'Sum' | 'Avg' | 'Min' | 'Max';
  dateColumn: Field | null;
  conditionString: string;
  limit: number;
  dataLabelOption: 'showValues' | 'percentage' | 'none';
  enableCombination: boolean;
  sortBy: Field | null;
  content: string;
  fontSize: number;
  color: string;
  width: number;
  height: number;
  title: string;
  labelPosition: 'Top' | 'Btm' | 'Lft' | 'Rgt';
  userEditedTitle: boolean;
  xPos?: number;
  yPos?: number;
  showTable?: boolean;
}

interface DrilldownRow {
  detail: string;
  measureValue: number;
  contributionPct: string;
  status: 'Healthy' | 'Watch' | 'Risk';
  owner: string;
}

interface DrilldownState {
  sourceElementId: string;
  sourceRow: number;
  pointLabel: string;
  dimensionLabel: string;
  measureLabel: string;
  agg: 'Sum' | 'Avg' | 'Min' | 'Max';
  rows: DrilldownRow[];
}

interface PageFilterItem {
  column: string;
  value: string;
}


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="app-container" (mousemove)="onGlobalMouseMove($event)" (mouseup)="onGlobalMouseUp()" (click)="closeAddMenu()">
      <!-- Header -->
      <header class="main-header">
        <div class="header-left">
          <h1>Sales Metrics</h1>
        </div>
        <div class="header-right">
          <div style="position: relative; display: flex; gap: 8px; align-items: center;" (click)="$event.stopPropagation()">
            <button class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 4px;" (click)="toggleAddMenu($event)">
              Add
              <mat-icon style="font-size: 18px; width: 18px; height: 18px;">arrow_drop_down</mat-icon>
            </button>
            @if (addMenuOpen()) {
              <div style="position: absolute; right: 0; top: calc(100% + 6px); background: #fff; border: 1px solid #d1d5db; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); min-width: 170px; overflow: hidden; z-index: 180;">
                <button style="width: 100%; text-align: left; border: 0; background: #fff; padding: 10px 12px; cursor: pointer;" (click)="addFromMenu('chart', $event)">Create Widget</button>
                <button style="width: 100%; text-align: left; border: 0; background: #fff; padding: 10px 12px; cursor: pointer;" (click)="addFromMenu('text', $event)">Create Text</button>
                <button style="width: 100%; text-align: left; border: 0; background: #fff; padding: 10px 12px; cursor: pointer; color: #b91c1c;" (click)="resetDashboard($event)">Create Dashboard</button>
              </div>
            }
          </div>
          <button class="btn-icon" (click)="toggleSidebar()">
            <mat-icon>{{ sidebarOpened() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          </button>
        </div>
      </header>

      <div class="main-layout">
        <!-- Canvas -->
        <main class="canvas-area" id="canvas-container">
          <section style="position: sticky; top: 0; z-index: 40; background: #e5e7eb; border: 1px solid #d1d5db; border-radius: 14px; padding: 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: end; gap: 10px; flex-wrap: wrap;">
              <label style="display: flex; flex-direction: column; gap: 4px; min-width: 220px;">
                <span style="font-size: 12px; color: #6b7280;">Auto date filter</span>
                <div style="position: relative;">
                  <mat-icon style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 16px; width: 16px; height: 16px; color: #6b7280;">calendar_today</mat-icon>
                  <select class="form-input" style="padding-left: 34px;" [(ngModel)]="topFilterDateRange" (ngModelChange)="onTopDateFilterChange()">
                    @for (item of topFilterDateRanges; track item) {
                      <option [value]="item">{{ item }}</option>
                    }
                  </select>
                </div>
              </label>
              <div style="position: relative;" (click)="$event.stopPropagation()">
                <button class="btn btn-secondary" style="display:inline-flex;align-items:center;gap:6px;" (click)="togglePageFilterPicker($event)">
                  + Add Page Filter
                </button>
                @if (pageFilterPickerOpen()) {
                  <div style="position:absolute;right:0;top:calc(100% + 6px);width:260px;background:#fff;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:170;">
                    <div style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;font-weight:700;">Common Columns</div>
                    <div style="max-height:220px;overflow:auto;padding:8px 10px;">
                      @if (getCommonFilterColumns().length === 0) {
                        <div style="font-size:12px;color:#9ca3af;padding:8px;">No common columns found</div>
                      } @else {
                        @for (col of getCommonFilterColumns(); track col) {
                          <label style="display:flex;align-items:center;gap:8px;padding:6px 2px;font-size:13px;color:#334155;cursor:pointer;">
                            <input type="checkbox" [checked]="isPendingPageFilterSelected(col)" (change)="togglePendingPageFilter(col)">
                            <span>{{ col }}</span>
                          </label>
                        }
                      }
                    </div>
                    <div style="display:flex;justify-content:flex-end;gap:8px;padding:10px;border-top:1px solid #e5e7eb;">
                      <button class="btn btn-secondary" style="padding:6px 10px;" (click)="clearPageFilterPickerSelection()">Clear</button>
                      <button class="btn btn-primary" style="padding:6px 10px;" (click)="applyPageFilterSelection($event)">Done</button>
                    </div>
                  </div>
                }
              </div>
            </div>

            @if (pageFilters().length > 0) {
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:12px;">
                @for (pf of pageFilters(); track pf.column) {
                  <div style="display:flex;flex-direction:column;gap:4px;">
                    <label style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                      <span style="font-size:12px;color:#6b7280;">{{ pf.column }}</span>
                      <button type="button" style="border:0;background:transparent;cursor:pointer;color:#94a3b8;line-height:1;" (click)="removePageFilter(pf.column, $event)">×</button>
                    </label>
                    <select class="form-input" [ngModel]="pf.value" (ngModelChange)="onPageFilterValueChange(pf.column, $event)">
                      @for (opt of getFilterOptionsForColumn(pf.column); track opt) {
                        <option [value]="opt">{{ opt }}</option>
                      }
                    </select>
                    @if (showIneligibleFilterWarning(pf.column)) {
                      <div style="font-size:11px;color:#b45309;">Few Charts are not eligible for this filter item.</div>
                    }
                  </div>
                }
              </div>
            }
          </section>
          <div class="grid-container" id="grid-canvas">
            @for (el of elements(); track el.id) {
              <div [id]="el.id"
                   class="widget-card"
                   [class.selected]="selectedId() === el.id"
                   [class.text-widget]="el.type === 'text'"
                   [style.grid-column]="'span ' + el.width"
                   [style.grid-row]="'span ' + el.height"
                   [style.transform]="getTransform(el)"
                   (mousedown)="selectElement(el.id)">

                <!-- Chart Header with Edit Icon -->
                @if (el.type === 'chart') {
                  <div class="widget-header drag-handle" (mousedown)="startDrag($event, el)">
                    <div class="header-main">
                      <span class="widget-title">{{ el.title }}</span>
                    </div>
                    <div class="widget-actions">
                      <button class="icon-action-btn" (click)="openProperties(); $event.stopPropagation()">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button class="icon-action-btn" (click)="removeElement(el.id); $event.stopPropagation()">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  </div>
                } @else {
                  <!-- Text Drag Handle -->
                  <div class="text-drag-handle drag-handle" (mousedown)="startDrag($event, el)">
                     <span class="edit-icon-text">::</span>
                  </div>
                }

                <div class="widget-body">
                  @if (el.type === 'chart') {
                    <div [id]="'chart-' + el.id" class="chart-box"></div>
                  } @else {
                    <div class="text-box" [style.font-size.px]="el.fontSize" [style.color]="el.color">
                      {{ el.content }}
                    </div>
                  }
                  <div class="resize-handle" (mousedown)="startResize($event, el)"></div>
                </div>
              </div>
              @if (shouldRenderDrilldownAfter(el.id) && activeDrilldown(); as dd) {
                <section class="canvas-drilldown-panel"
                         [style.grid-row-end]="'span ' + getDrilldownPanelRowSpan(dd.rows.length)"
                         [style.margin-bottom.px]="16">
                  <div class="panel-top">
                    <div>
                      <div class="drilldown-title">Drilldown: {{ dd.pointLabel }}</div>
                      <div class="drilldown-subtitle">{{ dd.agg }} of {{ dd.measureLabel }} by {{ dd.dimensionLabel }}</div>
                    </div>
                    <button class="close-drilldown-btn" (click)="closeDrilldown()">Close</button>
                  </div>
                  <div class="drilldown-table-wrap">
                    <table class="drilldown-table">
                      <thead>
                        <tr>
                          <th>{{ dd.dimensionLabel }} Detail</th>
                          <th>{{ dd.agg }} {{ dd.measureLabel }}</th>
                          <th>Contribution</th>
                          <th>Status</th>
                          <th>Owner</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (row of dd.rows; track $index) {
                          <tr>
                            <td>{{ row.detail }}</td>
                            <td>{{ row.measureValue | number:'1.0-0' }}</td>
                            <td>{{ row.contributionPct }}</td>
                            <td>
                              <span class="status-badge" [class.risk]="row.status === 'Risk'" [class.watch]="row.status === 'Watch'">
                                {{ row.status }}
                              </span>
                            </td>
                            <td>{{ row.owner }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </section>
              }
            }
          </div>
        </main>

        <!-- Sidebar -->
        <aside class="sidebar" [class.open]="sidebarOpened()" style="position: relative; z-index: 140;">
          <div class="sidebar-tabs">
            <div class="tab" [class.active]="activeTab === 'PROPERTIES'" (click)="activeTab = 'PROPERTIES'">VISUALIZATIONS</div>
            <div class="tab" [class.active]="activeTab === 'ADVANCED'" (click)="activeTab = 'ADVANCED'">ADVANCE OPTIONS</div>
          </div>

          <div class="sidebar-content">
            @if (selectedElement(); as el) {

              <!-- PROPERTIES TAB -->
              @if (activeTab === 'PROPERTIES') {
                <div class="config-container">
                  <section class="config-section">
                    <label>WIDGET NAME</label>
                    <input type="text" [(ngModel)]="el.title" (ngModelChange)="updateTitle(el)" class="form-input" placeholder="Enter widget name...">
                  </section>

                  @if (el.type === 'chart') {
                    <section class="config-section">
                      <div class="vis-grid">
                        @for (v of visTypes; track v.id) {
                          <button class="vis-btn" [class.active]="el.visType === v.id" (click)="updateVisType(v.id)">
                            @if (v.id === 'counter') {
                              {{ v.icon }}
                            } @else {
                              <mat-icon>{{ v.icon }}</mat-icon>
                            }
                          </button>
                        }
                      </div>
                    </section>

                    <section class="config-section">
                      <label>DATASET SELECTION</label>
                      <select class="form-input select-input" [ngModel]="el.dataset" (ngModelChange)="onDatasetChange(el, $event)">
                        @for (name of getDatasetNames(); track name) {
                          <option [value]="name">{{ name }}</option>
                        }
                      </select>
                    </section>

                    <section class="config-section">
                      <label>CATEGORY X AXIS</label>
                      <input class="form-input" type="text" placeholder="Search category..." [ngModel]="getCategorySearch(el.id)" (ngModelChange)="setCategorySearch(el.id, $event)">
                      <select class="form-input select-input"
                              [ngModel]="el.xAxis?.id || ''"
                              (ngModelChange)="onDimensionSelect(el, $event, 'xAxis')">
                        <option value="">Select category</option>
                        @for (field of getFilteredDimensionFields(el); track field.id) {
                          <option [value]="field.id">{{ field.name }}</option>
                        }
                      </select>
                    </section>

                    <section class="config-section">
                      <label>VALUES Y AXIS</label>
                      <input class="form-input" type="text" placeholder="Search values..." [ngModel]="getValueSearch(el.id)" (ngModelChange)="setValueSearch(el.id, $event)">
                      <div class="value-chip">
                        <select class="form-input select-input"
                                multiple
                                [ngModel]="getSelectedMeasureIds(el)"
                                (ngModelChange)="onMeasureSelect(el, $event)">
                          @for (field of getFilteredMeasureFields(el); track field.id) {
                            <option [value]="field.id">{{ field.name }}</option>
                          }
                        </select>
                        <select [(ngModel)]="el.yAgg" (change)="onAggChange(el)" class="agg-select">
                          <option value="Sum">Sum</option>
                          <option value="Avg">Avg</option>
                          <option value="Min">Min</option>
                          <option value="Max">Max</option>
                        </select>
                      </div>
                    </section>

                    <section class="config-section">
                      <label>LEGEND</label>
                      <select class="form-input select-input"
                              [ngModel]="el.legend?.id || ''"
                              (ngModelChange)="onDimensionSelect(el, $event, 'legend')">
                        <option value="">Select legend</option>
                        @for (field of getDimensionFields(el); track field.id) {
                          <option [value]="field.id">{{ field.name }}</option>
                        }
                      </select>
                    </section>

                    <section class="config-section">
                      <label>DRILL DOWN</label>
                      <select class="form-input select-input"
                              [ngModel]="el.drillDownField?.id || ''"
                              (ngModelChange)="onDimensionSelect(el, $event, 'drillDownField')">
                        <option value="">Select drill down</option>
                        @for (field of getDimensionFields(el); track field.id) {
                          <option [value]="field.id">{{ field.name }}</option>
                        }
                      </select>
                    </section>

                    <section class="config-section">
                      <label>COLUMNS</label>
                      <select class="form-input select-input"
                              [ngModel]="el.columnsField?.id || ''"
                              (ngModelChange)="onDimensionSelect(el, $event, 'columnsField')">
                        <option value="">Select columns</option>
                        @for (field of getDimensionFields(el); track field.id) {
                          <option [value]="field.id">{{ field.name }}</option>
                        }
                      </select>
                    </section>
                  } @else {
                    <section class="config-section">
                      <label>CONTENT</label>
                      <textarea [(ngModel)]="el.content" class="form-input" rows="4"></textarea>
                    </section>
                    <div class="prop-row">
                       <div class="prop-item">
                         <label>Font Size</label>
                         <input type="number" [(ngModel)]="el.fontSize" class="form-input">
                       </div>
                       <div class="prop-item">
                         <label>Color</label>
                         <input type="color" [(ngModel)]="el.color" class="color-input">
                       </div>
                    </div>
                  }

                  @if (el.type === 'chart') {
                    <div class="widget-footer-actions" style="position: sticky; bottom: 0; background: #fff; padding-top: 10px; border-top: 1px solid #f1f5f9;">
                      <button class="save-btn"
                              [class.active]="isChartDirty(el)"
                              [disabled]="!isChartDirty(el)"
                              (click)="saveChart(el)">
                        Save Chart
                      </button>
                      <button class="remove-btn half" (click)="removeElement(el.id)">Delete Widget</button>
                    </div>
                  } @else {
                    <button class="remove-btn" style="position: sticky; bottom: 0; margin-top: 12px;" (click)="removeElement(el.id)">Delete Widget</button>
                  }
                </div>
              }

              <!-- DATA TAB -->
              @if (activeTab === 'ADVANCED') {
                <div class="data-explorer">
                  @if (selectedElement()?.type === 'chart') {
                    @if (selectedElement(); as selChart) {
                      <section class="config-section">
                        <label>LABEL POSITION</label>
                        <div class="btn-group">
                          @for (pos of ['Top', 'Btm', 'Lft', 'Rgt']; track pos) {
                            <button [class.active]="selChart.labelPosition === pos" (click)="setLabelPosition(selChart, pos)">
                              {{ pos }}
                            </button>
                          }
                        </div>
                      </section>

                      <section class="config-section">
                        <label>DATE COLUMN</label>
                        <select class="form-input select-input"
                                [ngModel]="selChart.dateColumn?.id || ''"
                                (ngModelChange)="onDimensionSelect(selChart, $event, 'dateColumn')">
                          <option value="">Select date column</option>
                          @for (field of getDimensionFields(selChart); track field.id) {
                            <option [value]="field.id">{{ field.name }}</option>
                          }
                        </select>
                      </section>

                      <section class="config-section">
                        <label>CONDITION STRING</label>
                        <input class="form-input" type="text" [(ngModel)]="selChart.conditionString" (ngModelChange)="markChartDirty(selChart.id)" placeholder="e.g. Amount > 1000">
                      </section>

                      <section class="config-section">
                        <label>LIMIT (0-10)</label>
                        <input class="form-input" type="number" min="0" max="10" [(ngModel)]="selChart.limit" (ngModelChange)="onLimitChange(selChart)">
                      </section>

                      <section class="config-section">
                        <label>DATA LABEL OPTIONS</label>
                        <select class="form-input select-input" [(ngModel)]="selChart.dataLabelOption" (ngModelChange)="onDataLabelOptionChange(selChart)">
                          <option value="showValues">Show Values</option>
                          <option value="percentage">Percentage</option>
                          <option value="none">None</option>
                        </select>
                      </section>

                      <section class="config-section">
                        <label class="checkbox-row">
                          <input type="checkbox" [(ngModel)]="selChart.enableCombination" (change)="onCombinationToggle(selChart)">
                          Enable Combination Chart
                        </label>
                      </section>

                      <section class="config-section">
                        <label>SORT BY</label>
                        <select class="form-input select-input"
                                [ngModel]="selChart.sortBy?.id || ''"
                                (ngModelChange)="onSortByChange(selChart, $event)">
                          <option value="">Select sort field</option>
                          @for (field of getAllFields(selChart); track field.id) {
                            <option [value]="field.id">{{ field.name }}</option>
                          }
                        </select>
                      </section>
                    }
                  } @else {
                    <div class="empty-sidebar">
                      <span>Tune</span>
                      <p>Advance options are available for chart widgets only.</p>
                    </div>
                  }
                </div>
              }

            } @else {
              <div class="empty-sidebar">
                <span>Select</span>
                <p>Select a widget to edit properties</p>
              </div>
            }
          </div>
        </aside>
      </div>
    </div>
  `,
  // styles: [`
  //   :host {
  //     --primary: #2563eb;
  //     --bg: #f1f5f9;
  //     --card: #ffffff;
  //     --text: #1e293b;
  //     --border: #e2e8f0;
  //     display: block;
  //     height: 100vh;
  //     font-family: 'Inter', system-ui, sans-serif;
  //   }

  //   .app-container { display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: var(--bg); position: relative; }

  //   .main-header {
  //     height: 45px;
  //     background: white;
  //     border-bottom: 1px solid var(--border);
  //     display: flex;
  //     align-items: center;
  //     justify-content: space-between;
  //     padding: 0 24px;
  //     z-index: 100;
  //   }

  //   .main-header h1 { font-size: 1.1rem; font-weight: 700; color: #334155; margin: 0; }
  //   .header-right { display: flex; gap: 12px; align-items: center; }

  //   .btn { padding: 8px 16px; border-radius: 4px; font-weight: 600; font-size: 0.75rem; border: none; cursor: pointer; transition: 0.2s; text-transform: uppercase; }
  //   .btn-primary { background: #eab308; color: #451a03; }
  //   .btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
  //   .btn-icon { background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; border-radius: 4px; }

  //   .main-layout { display: flex; flex: 1; overflow: hidden; }
  //   .canvas-area { flex: 1; overflow: auto; padding: 20px; position: relative; }

  //   .grid-container {
  //     display: grid;
  //     grid-template-columns: repeat(12, 1fr);
  //     grid-auto-rows: 80px;
  //     gap: 16px;
  //     min-width: 1000px;
  //   }

  //   .widget-card {
  //     background: var(--card);
  //     border-radius: 4px;
  //     border: 1px solid var(--border);
  //     display: flex;
  //     flex-direction: column;
  //     position: relative;
  //     transition: box-shadow 0.2s;
  //   }

  //   .widget-card.text-widget { background: transparent; border: 1px dashed transparent; box-shadow: none; }
  //   .widget-card.text-widget.selected { border: 1px dashed var(--primary); }
  //   .widget-card.selected { border: 2px solid var(--primary); z-index: 50; }

  //   .widget-header {
  //     padding: 8px 12px;
  //     border-bottom: 1px solid var(--border);
  //     display: flex;
  //     justify-content: space-between;
  //     align-items: center;
  //     cursor: move;
  //     background: #f8fafc;
  //     user-select: none;
  //   }

  //   .header-main { display: flex; align-items: center; gap: 8px; }
  //   .icon-action-btn { background: none; border: 0; cursor: pointer; color: #94a3b8; padding: 0; display: grid; place-items: center; }
  //   .icon-action-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

  //   .text-drag-handle {
  //       position: absolute; top: -10px; left: 0; right: 0; height: 20px;
  //       display: flex; justify-content: center; align-items: center;
  //       cursor: move; opacity: 0; transition: opacity 0.2s;
  //   }
  //   .widget-card:hover .text-drag-handle { opacity: 1; }
  //   .edit-icon-text { font-size: 18px; color: var(--primary); background: white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

  //   .widget-title { font-size: 0.65rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
  //   .widget-actions { display: flex; align-items: center; gap: 8px; }

  //   .widget-body { flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column; }
  //   .chart-box { width: 100%; height: 100%; min-height: 140px; }
  //   .text-box { padding: 8px; height: 100%; overflow: hidden; }
  //   .canvas-drilldown-panel {
  //     grid-column: 1 / -1;
  //     min-height: 220px;
  //     border: 1px solid #dbeafe;
  //     background: #f8fbff;
  //     border-radius: 6px;
  //     padding: 12px;
  //     display: flex;
  //     flex-direction: column;
  //     gap: 10px;
  //   }
  //   .panel-top {
  //     display: flex;
  //     justify-content: space-between;
  //     align-items: center;
  //   }
  //   .close-drilldown-btn {
  //     border: 1px solid #bfdbfe;
  //     background: white;
  //     color: #1d4ed8;
  //     padding: 6px 10px;
  //     border-radius: 4px;
  //     font-size: 0.72rem;
  //     font-weight: 700;
  //     cursor: pointer;
  //     text-transform: uppercase;
  //   }
  //   .drilldown-title { font-size: 0.72rem; font-weight: 800; color: #334155; margin-bottom: 2px; text-transform: uppercase; }
  //   .drilldown-subtitle { font-size: 0.68rem; color: #64748b; margin-bottom: 8px; }
  //   .drilldown-table-wrap { background: white; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; }
  //   .drilldown-table { width: 100%; border-collapse: collapse; font-size: 0.7rem; }
  //   .drilldown-table th {
  //     background: #f1f5f9;
  //     color: #64748b;
  //     text-align: left;
  //     padding: 8px;
  //     border-bottom: 1px solid #e2e8f0;
  //     font-weight: 700;
  //   }
  //   .drilldown-table td {
  //     padding: 8px;
  //     border-bottom: 1px solid #f1f5f9;
  //     color: #334155;
  //   }
  //   .status-badge {
  //     display: inline-block;
  //     padding: 2px 6px;
  //     border-radius: 999px;
  //     background: #dcfce7;
  //     color: #166534;
  //     font-weight: 700;
  //     font-size: 0.62rem;
  //   }
  //   .status-badge.watch { background: #fef9c3; color: #854d0e; }
  //   .status-badge.risk { background: #fee2e2; color: #991b1b; }

  //   .sidebar {
  //     width: 0;
  //     background: white;
  //     border-left: 1px solid var(--border);
  //     display: flex;
  //     flex-direction: column;
  //     transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  //     overflow: hidden;
  //   }
  //   .sidebar.open { width: 360px; }

  //   .sidebar-tabs { display: flex; border-bottom: 1px solid var(--border); background: #f8fafc; }
  //   .tab { flex: 1; padding: 14px; text-align: center; font-size: 0.7rem; font-weight: 800; color: #64748b; border-bottom: 3px solid transparent; cursor: pointer; text-transform: uppercase; }
  //   .tab.active { color: var(--primary); border-bottom-color: var(--primary); background: white; }

  //   .sidebar-content { padding: 20px; overflow-y: auto; flex: 1; background: #fff; }
  //   .config-section { margin-bottom: 24px; }
  //   .config-section label { display: block; font-size: 0.65rem; font-weight: 800; color: #94a3b8; margin-bottom: 10px; text-transform: uppercase; }

  //   .form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 4px; font-size: 0.8rem; outline: none; box-sizing: border-box; }
  //   .select-input { appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 12px top 50%; background-size: 10px auto; }

  //   .vis-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  //   .vis-btn { aspect-ratio: 1; border: 1px solid var(--border); border-radius: 4px; background: white; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  //   .vis-btn.active { border-color: var(--primary); background: #eff6ff; }

  //   .btn-group { display: flex; gap: 4px; background: #f1f5f9; padding: 4px; border-radius: 6px; }
  //   .btn-group button { flex: 1; border: none; padding: 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; background: transparent; cursor: pointer; color: #64748b; }
  //   .btn-group button.active { background: white; color: var(--primary); box-shadow: 0 1px 2px rgba(0,0,0,0.1); }

  //   .drop-zones-container { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
  //   .drop-panel { border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; }
  //   .drop-panel label { font-size: 0.6rem; font-weight: 800; color: #94a3b8; margin-bottom: 6px; display: block; }
  //   .drop-zone-placeholder { border: 1px dashed #cbd5e1; min-height: 40px; border-radius: 4px; display: flex; align-items: center; padding: 0 12px; font-size: 0.75rem; color: #94a3b8; }
  //   .drop-zone-placeholder.filled { border-style: solid; border-color: #3b82f6; background: #f0f7ff; color: #3b82f6; font-weight: 700; }

  //   .value-chip { display: flex; justify-content: space-between; align-items: center; width: 100%; }
  //   .agg-select { background: #3b82f6; color: white; border: none; font-size: 10px; border-radius: 3px; padding: 2px 4px; font-weight: bold; outline: none; }

  //   .field-row { display: flex; align-items: center; padding: 10px; border-radius: 4px; cursor: pointer; margin-bottom: 4px; background: #f8fafc; border: 1px solid transparent; }
  //   .field-row:hover { border-color: #cbd5e1; }
  //   .field-row.active { border-color: var(--primary); background: #eff6ff; }
  //   .check-icon { margin-left: auto; font-size: 18px; color: var(--primary); }
  //   .field-icon { width: 24px; font-size: 0.7rem; font-weight: 800; color: #94a3b8; margin-right: 8px; }
  //   .field-icon.measure { color: var(--primary); }
  //   .field-label { font-size: 0.8rem; color: #475569; }

  //   .prop-row { display: flex; gap: 12px; margin-top: 12px; }
  //   .prop-item { flex: 1; }
  //   .color-input { width: 100%; height: 40px; border: 1px solid var(--border); padding: 2px; border-radius: 4px; }

  //   .remove-btn { width: 100%; margin-top: 40px; padding: 10px; background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: 700; }
  //   .remove-btn.half { width: auto; margin-top: 0; flex: 1; }
  //   .widget-footer-actions { display: flex; gap: 10px; margin-top: 28px; }
  //   .save-btn {
  //     flex: 1;
  //     padding: 10px;
  //     background: #dbeafe;
  //     color: #64748b;
  //     font-size: 0.75rem;
  //     font-weight: 700;
  //     cursor: not-allowed;
  //   }
  //   .save-btn.active {
  //     background: #2563eb;
  //     color: white;
  //     cursor: pointer;
  //   }
  //   .resize-handle { position: absolute; right: 0; bottom: 0; width: 20px; height: 20px; cursor: nwse-resize; z-index: 10; }
  // `]
  styleUrls: ['./app.scss']
})
export class App implements OnInit {
  private readonly chartPersistenceService = inject(ChartPersistenceService);
  private highchartsLib: any = Highcharts;
  private drilldownModuleReady = false;

  sidebarOpened = signal(false);
  selectedId = signal<string | null>(null);
  elements = signal<DashboardElement[]>([]);
  activeTab: 'PROPERTIES' | 'ADVANCED' = 'PROPERTIES';
  activeDrilldown = signal<DrilldownState | null>(null);
  dirtyChartIds = signal<Set<string>>(new Set());
  addMenuOpen = signal(false);
  pageFilterPickerOpen = signal(false);
  pendingPageFilterColumns = signal<Set<string>>(new Set());
  pageFilters = signal<PageFilterItem[]>([]);
  categorySearchByChart: Record<string, string> = {};
  valueSearchByChart: Record<string, string> = {};
  selectedMeasureIdsByChart: Record<string, string[]> = {};
  topFilterDateRange = 'This Week';
  topFilterService = 'All';
  topFilterPost = 'All';
  topFilterDateRanges = ['This Week', 'This Month', 'Last 30 Days', 'This Quarter', 'Custom'];
  topFilterServices = ['All', 'North', 'South', 'Central', 'East', 'West'];
  topFilterPosts = ['All', 'APAC', 'North America', 'LATAM', 'EMEA'];

  // State for manual dragging/resizing
  draggingElement: DashboardElement | null = null;
  resizingElement: DashboardElement | null = null;
  dragOffset = { x: 0, y: 0 };
  resizeStart = { w: 0, h: 0, x: 0, y: 0 };

  datasets: Record<string, Field[]> = {
    Invoices: [
      { id: 'i1', name: 'Invoice ID', type: 'dimension' },
      { id: 'i2', name: 'Customer Name', type: 'dimension' },
      { id: 'i3', name: 'Billing Date', type: 'dimension' },
      { id: 'i4', name: 'Due Date', type: 'dimension' },
      { id: 'i5', name: 'Region', type: 'dimension' },
      { id: 'i6', name: 'Country', type: 'dimension' },
      { id: 'i7', name: 'City', type: 'dimension' },
      { id: 'i8', name: 'Sales Rep', type: 'dimension' },
      { id: 'i9', name: 'Payment Status', type: 'dimension' },
      { id: 'i10', name: 'Customer Segment', type: 'dimension' },
      { id: 'i11', name: 'Invoice Type', type: 'dimension' },
      { id: 'im1', name: 'Invoice Amount', type: 'measure' },
      { id: 'im2', name: 'Tax Total', type: 'measure' },
      { id: 'im3', name: 'Discount Amount', type: 'measure' },
      { id: 'im4', name: 'Net Amount', type: 'measure' },
      { id: 'im5', name: 'Paid Amount', type: 'measure' },
      { id: 'im6', name: 'Balance Due', type: 'measure' }
    ],
    Sales: [
      { id: 's1', name: 'Category', type: 'dimension' },
      { id: 's2', name: 'Region', type: 'dimension' },
      { id: 's3', name: 'Store Name', type: 'dimension' },
      { id: 'sm1', name: 'Total Sales', type: 'measure' },
      { id: 'sm2', name: 'Profit Margin', type: 'measure' }
    ],
    Transactions: [
      { id: 't1', name: 'TX Type', type: 'dimension' },
      { id: 't2', name: 'Merchant', type: 'dimension' },
      { id: 'tm1', name: 'Amount', type: 'measure' },
      { id: 'tm2', name: 'Volume', type: 'measure' }
    ]
  };

  visTypes = [
    { id: 'column', icon: 'bar_chart' }, { id: 'bar', icon: 'stacked_bar_chart' },
    { id: 'line', icon: 'show_chart' }, { id: 'pie', icon: 'pie_chart' },
    { id: 'area', icon: 'area_chart' }, { id: 'pie-drilldown', icon: 'donut_large' },
    { id: 'counter', icon: '123' }
  ];

  selectedElement = computed(() => this.elements().find(e => e.id === this.selectedId()));

  constructor() {
    console.log('App initialized:');
  }

  async ngOnInit() {
    await this.initializeLibraries();
    if (this.elements().length === 0) {
      this.addDefaultHighchartsDrilldownWidget();
    }
  }

  async initializeLibraries() {
    if (!this.highchartsLib?.chart) {
      try {
        const mod = await import('highcharts');
        this.highchartsLib = mod.default;
      } catch (error) {
        console.error('[LIB_INIT_ERROR] Highcharts failed to load', error);
      }
    }

    if (!this.drilldownModuleReady && this.highchartsLib) {
      try {
        const drilldownMod = await import('highcharts/modules/drilldown');
        const attachDrilldown = (drilldownMod as any).default || (drilldownMod as any);
        if (typeof attachDrilldown === 'function') {
          attachDrilldown(this.highchartsLib);
        }
        this.drilldownModuleReady = true;
      } catch (error) {
        console.error('[LIB_INIT_ERROR] Highcharts drilldown module failed to load', error);
      }
    }
  }

  addDefaultHighchartsDrilldownWidget() {
    const id = 'el-' + Math.random().toString(36).substr(2, 9);
    const defaultChart: DashboardElement = {
      id,
      type: 'chart',
      visType: 'pie-drilldown',
      dataset: 'Sales',
      xAxis: this.datasets['Sales'].find(field => field.id === 's2') || null, // Region
      yAxis: this.datasets['Sales'].find(field => field.id === 'sm1') || null, // Total Sales
      yAxes: this.datasets['Sales'].filter(field => field.id === 'sm1'),
      legend: null,
      drillDownField: null,
      columnsField: null,
      yAgg: 'Sum',
      dateColumn: null,
      conditionString: '',
      limit: 4,
      dataLabelOption: 'showValues',
      enableCombination: false,
      sortBy: null,
      content: '',
      fontSize: 14,
      color: '#1e293b',
      width: 6,
      height: 4,
      title: 'Sales by Region',
      labelPosition: 'Btm',
      userEditedTitle: false,
      xPos: 0,
      yPos: 0,
      showTable: false
    };

    this.elements.update(prev => [...prev, defaultChart]);
    this.selectedMeasureIdsByChart[id] = ['sm1'];
    this.markChartSaved(id);
    this.scheduleChartRenderById(id);
  }

  closeDrilldown() {
    this.activeDrilldown.set(null);
  }

  toggleSidebar() {
    const isClosingSidebar = this.sidebarOpened();
    if (isClosingSidebar && this.hasUnsavedChartChanges()) {
      const shouldSave = window.confirm('There are unsaved chart changes. Do you want to save?');
      if (shouldSave) {
        this.saveAllDirtyCharts();
      }
    }
    this.sidebarOpened.set(!this.sidebarOpened());
  }

  toggleAddMenu(event: MouseEvent) {
    event.stopPropagation();
    this.addMenuOpen.set(!this.addMenuOpen());
  }

  closeAddMenu() {
    if (this.addMenuOpen()) {
      this.addMenuOpen.set(false);
    }
    if (this.pageFilterPickerOpen()) {
      this.pageFilterPickerOpen.set(false);
    }
  }

  addFromMenu(type: 'chart' | 'text', event: MouseEvent) {
    event.stopPropagation();
    this.addMenuOpen.set(false);
    this.addNewElement(type);
  }

  resetDashboard(event: MouseEvent) {
    event.stopPropagation();
    this.addMenuOpen.set(false);
    this.pageFilterPickerOpen.set(false);
    this.pendingPageFilterColumns.set(new Set());
    this.pageFilters.set([]);
    this.elements.set([]);
    this.selectedId.set(null);
    this.activeDrilldown.set(null);
    this.dirtyChartIds.set(new Set());
    this.categorySearchByChart = {};
    this.valueSearchByChart = {};
    this.selectedMeasureIdsByChart = {};
    this.draggingElement = null;
    this.resizingElement = null;
    this.sidebarOpened.set(false);
    this.topFilterDateRange = 'This Week';
    this.topFilterService = 'All';
    this.topFilterPost = 'All';
  }

  onTopDateFilterChange() {
    this.refreshAllCharts();
  }

  togglePageFilterPicker(event: MouseEvent) {
    event.stopPropagation();
    const next = !this.pageFilterPickerOpen();
    this.pageFilterPickerOpen.set(next);
    if (next) {
      this.pendingPageFilterColumns.set(new Set());
    }
  }

  clearPageFilterPickerSelection() {
    this.pendingPageFilterColumns.set(new Set());
  }

  isPendingPageFilterSelected(column: string): boolean {
    return this.pendingPageFilterColumns().has(column);
  }

  togglePendingPageFilter(column: string) {
    this.pendingPageFilterColumns.update(current => {
      const next = new Set(current);
      if (next.has(column)) next.delete(column);
      else next.add(column);
      return next;
    });
  }

  applyPageFilterSelection(event: MouseEvent) {
    event.stopPropagation();
    const selected = Array.from(this.pendingPageFilterColumns());
    this.pageFilters.update(current => {
      const existingColumns = new Set(current.map(item => item.column));
      const additions = selected
        .filter(column => !existingColumns.has(column))
        .map(column => ({ column, value: 'All' }));
      return [...current, ...additions];
    });
    this.pageFilterPickerOpen.set(false);
    this.pendingPageFilterColumns.set(new Set());
  }

  removePageFilter(column: string, event: MouseEvent) {
    event.stopPropagation();
    this.pageFilters.update(current => current.filter(item => item.column !== column));
    this.refreshChartsForPageFilter(column, 'All');
  }

  onPageFilterValueChange(column: string, value: string) {
    this.pageFilters.update(current =>
      current.map(item => item.column === column ? { ...item, value } : item)
    );
    this.refreshChartsForPageFilter(column, value);
  }

  getActiveChartElements(): DashboardElement[] {
    return this.elements().filter(el => el.type === 'chart');
  }

  getDimensionsForDataset(datasetName: 'Invoices' | 'Sales' | 'Transactions'): string[] {
    return (this.datasets[datasetName] || [])
      .filter(field => field.type === 'dimension')
      .map(field => field.name);
  }

  getCommonFilterColumns(): string[] {
    const chartElements = this.getActiveChartElements();
    const datasetsInUse = Array.from(new Set(chartElements.map(el => el.dataset)));
    if (!datasetsInUse.length) return [];

    let common = this.getDimensionsForDataset(datasetsInUse[0]);
    for (let i = 1; i < datasetsInUse.length; i++) {
      const dims = new Set(this.getDimensionsForDataset(datasetsInUse[i]));
      common = common.filter(column => dims.has(column));
    }
    return common.sort((a, b) => a.localeCompare(b));
  }

  isChartEligibleForFilter(el: DashboardElement, column: string): boolean {
    if (el.type !== 'chart') return false;
    return this.getDimensionsForDataset(el.dataset).includes(column);
  }

  showIneligibleFilterWarning(column: string): boolean {
    const charts = this.getActiveChartElements();
    if (!charts.length) return false;
    const eligibleCount = charts.filter(chart => this.isChartEligibleForFilter(chart, column)).length;
    return eligibleCount > 0 && eligibleCount < charts.length;
  }

  getFilterOptionsForColumn(column: string): string[] {
    const options = new Set<string>(['All']);
    this.getMockDimensionValues(column).forEach(value => options.add(value));
    return Array.from(options);
  }

  refreshAllCharts() {
    this.elements().forEach(el => this.refreshChart(el));
  }

  refreshChartsForPageFilter(column: string, value: string) {
    const eligibleCharts = this.getActiveChartElements().filter(chart => this.isChartEligibleForFilter(chart, column));
    console.log('[PAGE_FILTER_REFRESH] Eligible charts:', {
      filterColumn: column,
      filterValue: value,
      chartTitles: eligibleCharts.map(chart => chart.title || chart.id)
    });
    eligibleCharts.forEach(chart => this.refreshChart(chart));
  }

  scheduleChartRenderById(chartId: string) {
    setTimeout(() => {
      const chart = this.elements().find(el => el.id === chartId && el.type === 'chart');
      if (chart) this.refreshChart(chart);
    }, 80);
  }

  openProperties() {
    this.activeTab = 'PROPERTIES';
    this.sidebarOpened.set(true);
  }

  addNewElement(type: 'chart' | 'text') {
    const id = 'el-' + Math.random().toString(36).substr(2, 9);
    const newEl: DashboardElement = {
      id, type,
      visType: 'column', dataset: 'Invoices', xAxis: null, yAxis: null, yAxes: [], legend: null, drillDownField: null, columnsField: null, yAgg: 'Sum',
      dateColumn: null, conditionString: '', limit: 4, dataLabelOption: 'showValues', enableCombination: false, sortBy: null,
      content: 'Sample text widget. Click to edit content, font size and color.',
      fontSize: 14, color: '#1e293b',
      width: type === 'text' ? 4 : 4, height: 3,
      title: type === 'chart' ? 'New Chart' : 'Info Text',
      labelPosition: 'Btm',
      userEditedTitle: false,
      xPos: 0, yPos: 0, showTable: false
    };

    if (type === 'chart') {
      this.logChartPersistencePlaceholder(newEl);
    }

    this.elements.update(prev => [...prev, newEl]);
    this.selectedMeasureIdsByChart[id] = [];
    this.selectElement(id);
    this.sidebarOpened.set(true);
    this.activeTab = 'PROPERTIES';

    if (type === 'chart') {
      this.markChartDirty(id);
      this.scheduleChartRenderById(id);
    }
  }

  selectElement(id: string) {
    this.selectedId.set(id);
  }

  removeElement(id: string) {
    this.elements.update(prev => prev.filter(e => e.id !== id));
    if (this.selectedId() === id) this.selectedId.set(null);
    if (this.activeDrilldown()?.sourceElementId === id) this.activeDrilldown.set(null);
    delete this.selectedMeasureIdsByChart[id];
    delete this.categorySearchByChart[id];
    delete this.valueSearchByChart[id];
    this.markChartSaved(id);
  }

  onFieldClick(field: Field) {
    const el = this.selectedElement();
    if (!el || el.type !== 'chart') return;

    if (field.type === 'dimension') {
      el.xAxis = el.xAxis?.id === field.id ? null : field;
    } else {
      el.yAxis = el.yAxis?.id === field.id ? null : field;
    }

    this.applyAutoChartTitle(el);

    this.refreshChart(el);
    this.markChartDirty(el.id);
  }

  getDatasetNames(): Array<'Invoices' | 'Sales' | 'Transactions'> {
    return Object.keys(this.datasets) as Array<'Invoices' | 'Sales' | 'Transactions'>;
  }

  getAllFields(el: DashboardElement): Field[] {
    return this.datasets[el.dataset] || [];
  }

  getDimensionFields(el: DashboardElement): Field[] {
    return this.getAllFields(el).filter(f => f.type === 'dimension');
  }

  getMeasureFields(el: DashboardElement): Field[] {
    return this.getAllFields(el).filter(f => f.type === 'measure');
  }

  getSelectedMeasureIds(el: DashboardElement): string[] {
    const existing = this.selectedMeasureIdsByChart[el.id];
    if (existing) return existing;
    const ids = el.yAxes.map(field => field.id);
    this.selectedMeasureIdsByChart[el.id] = ids;
    return ids;
  }

  getCategorySearch(chartId: string): string {
    return this.categorySearchByChart[chartId] || '';
  }

  setCategorySearch(chartId: string, value: string) {
    this.categorySearchByChart[chartId] = value || '';
  }

  getValueSearch(chartId: string): string {
    return this.valueSearchByChart[chartId] || '';
  }

  setValueSearch(chartId: string, value: string) {
    this.valueSearchByChart[chartId] = value || '';
  }

  getFilteredDimensionFields(el: DashboardElement): Field[] {
    const term = this.getCategorySearch(el.id).toLowerCase().trim();
    const source = this.getDimensionFields(el);
    if (!term) return source;
    return source.filter(field => field.name.toLowerCase().includes(term));
  }

  getFilteredMeasureFields(el: DashboardElement): Field[] {
    const term = this.getValueSearch(el.id).toLowerCase().trim();
    const source = this.getMeasureFields(el);
    if (!term) return source;
    return source.filter(field => field.name.toLowerCase().includes(term));
  }

  findFieldById(el: DashboardElement, fieldId: string): Field | null {
    if (!fieldId) return null;
    return this.getAllFields(el).find(f => f.id === fieldId) || null;
  }

  onDatasetChange(el: DashboardElement, datasetName: 'Invoices' | 'Sales' | 'Transactions') {
    el.dataset = datasetName;
    el.xAxis = null;
    el.yAxis = null;
    el.yAxes = [];
    el.legend = null;
    el.drillDownField = null;
    el.columnsField = null;
    el.dateColumn = null;
    el.sortBy = null;
    this.selectedMeasureIdsByChart[el.id] = [];
    this.applyAutoChartTitle(el);
    this.refreshChart(el);
    this.markChartDirty(el.id);
  }

  onDimensionSelect(
    el: DashboardElement,
    fieldId: string,
    target: 'xAxis' | 'legend' | 'drillDownField' | 'columnsField' | 'dateColumn'
  ) {
    const selected = this.findFieldById(el, fieldId);
    el[target] = selected && selected.type === 'dimension' ? selected : null;
    this.applyAutoChartTitle(el);
    this.refreshChart(el);
    this.markChartDirty(el.id);
  }

  onMeasureSelect(el: DashboardElement, fieldIds: string[] | string) {
    const ids = Array.isArray(fieldIds) ? fieldIds : (fieldIds ? [fieldIds] : []);
    const selectedFields = ids
      .map(id => this.findFieldById(el, id))
      .filter((field): field is Field => !!field && field.type === 'measure')
      .slice(0, 2);

    el.yAxes = selectedFields;
    el.yAxis = selectedFields.length > 0 ? selectedFields[0] : null;
    this.selectedMeasureIdsByChart[el.id] = selectedFields.map(field => field.id);
    this.applyAutoChartTitle(el);
    this.refreshChart(el);
    this.markChartDirty(el.id);
  }

  onLimitChange(el: DashboardElement) {
    if (el.limit < 0) el.limit = 0;
    if (el.limit > 10) el.limit = 10;
    this.refreshChart(el);
    this.markChartDirty(el.id);
  }

  onDataLabelOptionChange(el: DashboardElement) {
    this.refreshChart(el);
    this.markChartDirty(el.id);
  }

  onCombinationToggle(el: DashboardElement) {
    this.refreshChart(el);
    this.markChartDirty(el.id);
  }

  onSortByChange(el: DashboardElement, fieldId: string) {
    el.sortBy = this.findFieldById(el, fieldId);
    this.refreshChart(el);
    this.markChartDirty(el.id);
  }

  isFieldSelected(field: Field): boolean {
    const el = this.selectedElement();
    return !!el && (el.xAxis?.id === field.id || el.yAxes.some(y => y.id === field.id));
  }

  setLabelPosition(el: DashboardElement, pos: any) {
    el.labelPosition = pos;
    this.refreshChart(el);
    this.markChartDirty(el.id);
  }

  updateVisType(type: string) {
    const el = this.selectedElement();
    if (el) {
      el.visType = type;
      this.refreshChart(el);
      this.markChartDirty(el.id);
    }
  }

  updateTitle(el: DashboardElement) {
    el.userEditedTitle = true;
    if (el.type === 'chart') {
      this.markChartDirty(el.id);
    }
  }

  onAggChange(el: DashboardElement) {
    this.applyAutoChartTitle(el);
    this.refreshChart(el);
    if (el.type === 'chart') {
      this.markChartDirty(el.id);
    }
  }

  getAutoChartTitle(el: DashboardElement): string {
    if (el.type !== 'chart') return el.title;
    const measureName = el.yAxis?.name;
    const dimensionName = el.xAxis?.name;
    if (!measureName && !dimensionName) return 'New Chart';
    if (measureName && dimensionName) {
      if (el.yAgg === 'Sum') return `${measureName} by ${dimensionName}`;
      return `${el.yAgg} ${measureName} by ${dimensionName}`;
    }
    if (measureName) {
      if (el.yAgg === 'Sum') return measureName;
      return `${el.yAgg} ${measureName}`;
    }
    return `By ${dimensionName}`;
  }

  applyAutoChartTitle(el: DashboardElement) {
    if (el.type !== 'chart' || el.userEditedTitle) return;
    el.title = this.getAutoChartTitle(el);
  }

  // --- Drag & Drop Logic ---
  startDrag(event: MouseEvent, el: DashboardElement) {
    event.stopPropagation();
    this.selectElement(el.id);
    this.draggingElement = el;
    this.dragOffset = {
      x: event.clientX - (el.xPos || 0),
      y: event.clientY - (el.yPos || 0)
    };
  }

  startResize(event: MouseEvent, el: DashboardElement) {
    event.stopPropagation();
    event.preventDefault();
    this.resizingElement = el;
    this.resizeStart = {
      w: el.width,
      h: el.height,
      x: event.clientX,
      y: event.clientY
    };
  }

  @HostListener('window:mousemove', ['$event'])
  onGlobalMouseMove(event: MouseEvent) {
    if (this.draggingElement) {
      this.draggingElement.xPos = event.clientX - this.dragOffset.x;
      this.draggingElement.yPos = event.clientY - this.dragOffset.y;
    }

    if (this.resizingElement) {
      const container = document.getElementById('grid-canvas');
      if (!container) return;
      const colWidth = container.offsetWidth / 12;
      const rowHeight = 80;

      const dx = event.clientX - this.resizeStart.x;
      const dy = event.clientY - this.resizeStart.y;

      const dw = Math.round(dx / colWidth);
      const dh = Math.round(dy / rowHeight);

      this.resizingElement.width = Math.max(1, Math.min(12, this.resizeStart.w + dw));
      this.resizingElement.height = Math.max(1, this.resizeStart.h + dh);
    }
  }

  @HostListener('window:mouseup')
  onGlobalMouseUp() {
    const dragged = this.draggingElement;
    const resized = this.resizingElement;

    if (this.draggingElement) {
      // Snap to grid
      const container = document.getElementById('grid-canvas');
      if (container) {
          // Simplified snapping - in a real grid we'd reorder the array,
          // here we just reset visually but maintain the new properties
          this.draggingElement.xPos = 0;
          this.draggingElement.yPos = 0;
      }
    }
    this.draggingElement = null;
    this.resizingElement = null;

    if (dragged?.type === 'chart') {
      this.markChartDirty(dragged.id);
    }
    if (resized?.type === 'chart') {
      this.markChartDirty(resized.id);
    }
  }

  getTransform(el: DashboardElement) {
    if (el.xPos || el.yPos) {
      return `translate(${el.xPos}px, ${el.yPos}px)`;
    }
    return 'none';
  }

  shouldRenderDrilldownAfter(elementId: string): boolean {
    const dd = this.activeDrilldown();
    if (!dd) return false;
    const rowEndId = this.getRowEndElementId(dd.sourceRow);
    return rowEndId === elementId;
  }

  getRowForElementId(elementId: string): number {
    const rowMap = this.buildRowMap();
    return rowMap.get(elementId) || 1;
  }

  getRowEndElementId(rowNumber: number): string | null {
    const rowEndMap = this.buildRowEndMap();
    return rowEndMap.get(rowNumber) || null;
  }

  buildRowMap(): Map<string, number> {
    const rowMap = new Map<string, number>();
    let row = 1;
    let consumedCols = 0;

    for (const el of this.elements()) {
      const span = Math.max(1, Math.min(12, el.width || 1));
      if (consumedCols + span > 12) {
        row += 1;
        consumedCols = 0;
      }
      rowMap.set(el.id, row);
      consumedCols += span;
    }

    return rowMap;
  }

  buildRowEndMap(): Map<number, string> {
    const rowEndMap = new Map<number, string>();
    let row = 1;
    let consumedCols = 0;

    for (const el of this.elements()) {
      const span = Math.max(1, Math.min(12, el.width || 1));
      if (consumedCols + span > 12) {
        row += 1;
        consumedCols = 0;
      }
      rowEndMap.set(row, el.id);
      consumedCols += span;
    }

    return rowEndMap;
  }

  openDrilldownFromPoint(el: DashboardElement, pointLabel: string) {
    if (el.type !== 'chart' || !el.xAxis || el.yAxes.length === 0) return;
    const sourceRow = this.getRowForElementId(el.id);
    const rows = this.getDrilldownRows(el, pointLabel);
    const drilldownEligibleElements = this.elements()
      .filter(item => item.type === 'chart' && item.xAxis && item.yAxis)
      .map(item => ({
        id: item.id,
        title: item.title,
        dimension: item.xAxis?.name,
        measure: item.yAxis?.name,
        visType: item.visType
      }));

    console.log('[DRILLDOWN_PLACEHOLDER] Chart point clicked. Drilldown eligible elements for API:', {
      clickedChartId: el.id,
      clickedPoint: pointLabel,
      eligibleElements: drilldownEligibleElements,
      mockRows: rows
    });

    this.activeDrilldown.set({
      sourceElementId: el.id,
      sourceRow,
      pointLabel,
      dimensionLabel: el.xAxis.name,
      measureLabel: el.yAxes.map(y => y.name).join(' / '),
      agg: el.yAgg,
      rows
    });
  }

  getDrilldownPanelRowSpan(rowCount: number): number {
    if (rowCount <= 4) return 5;
    if (rowCount <= 8) return 6;
    return 7;
  }

  logChartPersistencePlaceholder(el: DashboardElement) {
    console.log('[SAVE_CHART_PLACEHOLDER] Persist chart config before render (API integration pending):', {
      id: el.id,
      type: el.type,
      title: el.title,
      visType: el.visType,
      xAxis: el.xAxis?.name || null,
      yAxis: el.yAxis?.name || null,
      yAgg: el.yAgg,
      width: el.width,
      height: el.height,
      createdAt: '2026-02-13T00:00:00Z'
    });
  }

  isChartDirty(el: DashboardElement): boolean {
    return el.type === 'chart' && this.dirtyChartIds().has(el.id);
  }

  hasUnsavedChartChanges(): boolean {
    return this.dirtyChartIds().size > 0;
  }

  markChartDirty(chartId: string) {
    this.dirtyChartIds.update(current => {
      const next = new Set(current);
      next.add(chartId);
      return next;
    });
  }

  markChartSaved(chartId: string) {
    this.dirtyChartIds.update(current => {
      const next = new Set(current);
      next.delete(chartId);
      return next;
    });
  }

  buildChartPostPayload(el: DashboardElement): ChartPostPayload {
    return {
      id: el.id,
      title: el.title,
      visType: el.visType,
      xAxis: el.xAxis?.name || null,
      yAxis: el.yAxes[0]?.name || null,
      yAxes: el.yAxes.map(y => y.name),
      yAgg: el.yAgg,
      labelPosition: el.labelPosition,
      width: el.width,
      height: el.height,
      dataset: el.dataset,
      legend: el.legend?.name || null,
      drillDownField: el.drillDownField?.name || null,
      columnsField: el.columnsField?.name || null,
      dateColumn: el.dateColumn?.name || null,
      conditionString: el.conditionString,
      limit: el.limit,
      dataLabelOption: el.dataLabelOption,
      enableCombination: el.enableCombination,
      sortBy: el.sortBy?.name || null
    };
  }

  saveChart(el: DashboardElement) {
    if (el.type !== 'chart') return;
    const payload = this.buildChartPostPayload(el);

    this.chartPersistenceService.saveChart(payload).subscribe(() => {
      this.markChartSaved(el.id);
    });
  }

  saveAllDirtyCharts() {
    const dirtyIds = Array.from(this.dirtyChartIds());
    const dirtyCharts = this.elements().filter(el => el.type === 'chart' && dirtyIds.includes(el.id));
    dirtyCharts.forEach(el => this.saveChart(el));
  }

  getDrilldownRows(el: DashboardElement, pointLabel: string = 'All'): DrilldownRow[] {
    if (el.type !== 'chart' || !el.xAxis || !el.yAxis) return [];
    const details = ['Enterprise', 'SMB', 'Retail', 'Online', 'Wholesale'];
    const seedBase = (pointLabel + el.yAxis.name).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const values = details.map((_, idx) => 650 + ((seedBase + idx * 13) % 7) * 180);
    const total = values.reduce((sum, current) => sum + current, 0);

    return details.map((detail, index) => {
      const value = values[index];
      const pct = ((value / total) * 100).toFixed(1) + '%';
      const status: DrilldownRow['status'] =
        value > total * 0.3 ? 'Healthy' : value < total * 0.18 ? 'Risk' : 'Watch';

      return {
        detail: `${pointLabel} / ${detail}`,
        measureValue: value,
        contributionPct: pct,
        status,
        owner: ['Ops', 'Sales', 'Finance', 'Regional', 'HQ'][index]
      };
    });
  }

  getMockDimensionValues(dimensionName: string): string[] {
    switch (dimensionName) {
      case 'Region':
        return ['North', 'South', 'West', 'East'];
      case 'Store Name':
        return ['Store A', 'Store B', 'Store C', 'Store D'];
      case 'Billing Date':
        return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      case 'Customer Name':
        return ['Acme Ltd', 'Nova LLC', 'Pioneer Co', 'BluePeak'];
      case 'TX Type':
        return ['UPI', 'Card', 'Bank', 'Wallet'];
      default:
        return ['Segment A', 'Segment B', 'Segment C', 'Segment D'];
    }
  }

  aggregateValues(values: number[], agg: 'Sum' | 'Avg' | 'Min' | 'Max'): number {
    if (!values.length) return 0;
    switch (agg) {
      case 'Avg':
        return values.reduce((sum, current) => sum + current, 0) / values.length;
      case 'Min':
        return Math.min(...values);
      case 'Max':
        return Math.max(...values);
      case 'Sum':
      default:
        return values.reduce((sum, current) => sum + current, 0);
    }
  }

  formatCounterValue(value: number): string {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  }

  refreshChart(el: DashboardElement) {
    if (el.type !== 'chart') return;
    if (!this.highchartsLib?.chart) return;
    const container = document.getElementById('chart-' + el.id);
    if (!container) return;
    container.innerHTML = '';

    const hasData = !!el.xAxis && el.yAxes.length > 0;
    let categories = hasData ? this.getMockDimensionValues(el.xAxis!.name) : [];
    let values = categories.map((name, idx) => {
      const seed = name.charCodeAt(0) + (idx + 1) * 9;
      return 900 + (seed % 8) * 240;
    });

    if (el.sortBy) {
      const zipped = categories.map((category, idx) => ({ category, value: values[idx] }));
      zipped.sort((a, b) => b.value - a.value);
      categories = zipped.map(item => item.category);
      values = zipped.map(item => item.value);
    }

    if (el.limit >= 0 && el.limit <= 10) {
      const limitCount = el.limit === 0 ? categories.length : el.limit;
      categories = categories.slice(0, limitCount);
      values = values.slice(0, limitCount);
    }

    const activePageFilters = this.pageFilters().filter(item => item.value !== 'All');
    const eligibleFilters = activePageFilters.filter(item => this.isChartEligibleForFilter(el, item.column));
    for (const filter of eligibleFilters) {
      if (el.xAxis?.name === filter.column) {
        const filtered = categories
          .map((category, idx) => ({ category, value: values[idx] }))
          .filter(item => item.category === filter.value);
        if (filtered.length > 0) {
          categories = filtered.map(item => item.category);
          values = filtered.map(item => item.value);
        }
      } else {
        const seed = filter.value.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
        const factor = 0.65 + (seed % 30) / 100; // deterministic 0.65..0.94
        values = values.map(value => Math.round(value * factor));
      }
    }

    if (el.visType === 'pie-drilldown') {
      let regionData = [
        { name: 'North', y: 4100, drilldown: 'north' },
        { name: 'South', y: 3200, drilldown: 'south' },
        { name: 'West', y: 2700, drilldown: 'west' },
        { name: 'East', y: 2900, drilldown: 'east' }
      ];

      for (const filter of eligibleFilters) {
        if (filter.column === 'Region') {
          regionData = regionData.filter(item => item.name === filter.value);
        } else {
          const seed = filter.value.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
          const factor = 0.65 + (seed % 30) / 100;
          regionData = regionData.map(item => ({ ...item, y: Math.round(item.y * factor) }));
        }
      }

      this.highchartsLib.chart(container, {
        chart: { type: 'pie', backgroundColor: 'transparent' },
        title: { text: null },
        credits: { enabled: false },
        legend: { enabled: true, itemStyle: { fontSize: '10px', color: '#64748b' } },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: { enabled: true, format: '{point.name}: {point.percentage:.1f}%' }
          }
        },
        series: [{
          type: 'pie',
          name: 'Regions',
          colorByPoint: true,
          data: regionData
        }],
        drilldown: {
          series: [
            { id: 'north', type: 'column', name: 'North Stores', data: [['Store A', 1400], ['Store B', 1200], ['Store C', 900], ['Store D', 600]] },
            { id: 'south', type: 'column', name: 'South Stores', data: [['Store E', 1100], ['Store F', 900], ['Store G', 700], ['Store H', 500]] },
            { id: 'west', type: 'column', name: 'West Stores', data: [['Store I', 1000], ['Store J', 800], ['Store K', 500], ['Store L', 400]] },
            { id: 'east', type: 'column', name: 'East Stores', data: [['Store M', 1200], ['Store N', 900], ['Store O', 500], ['Store P', 300]] }
          ]
        } as any
      });
      return;
    }

    if (el.visType === 'counter') {
      if (!el.yAxes.length) {
        container.innerHTML = `
          <div style="height:100%;display:grid;place-items:center;color:#64748b;font-size:12px;">
            Select a measure to display counter
          </div>
        `;
        return;
      }

      const current = this.aggregateValues(values, el.yAgg);
      const trendSeed = el.yAxes[0].name.length + (el.limit || 0);
      const trendFactor = 0.82 + (trendSeed % 7) / 25; // deterministic 0.82..1.06
      const previous = current * trendFactor;
      const pctDelta = previous === 0 ? 0 : ((current - previous) / previous) * 100;
      const isUp = pctDelta >= 0;
      const pctLabel = `${isUp ? '+' : ''}${pctDelta.toFixed(1)}%`;
      const counterTitle = `${el.yAgg} of ${el.yAxes[0].name}`;

      container.innerHTML = `
        <div style="height:100%;display:flex;flex-direction:column;justify-content:center;padding:14px 16px;gap:6px;">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:.04em;">${counterTitle}</div>
          <div style="font-size:34px;line-height:1;color:#0f172a;font-weight:800;">${this.formatCounterValue(current)}</div>
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:${isUp ? '#15803d' : '#b91c1c'};">
            <span>${isUp ? '▲' : '▼'}</span>
            <span>${pctLabel}</span>
            <span style="color:#94a3b8;font-weight:600;">vs previous period</span>
          </div>
        </div>
      `;
      return;
    }

    const dataLabelEnabled = el.dataLabelOption !== 'none';
    const self = this;

    const primaryMeasureName = el.yAxes[0]?.name ?? 'Value';
    const primarySeries = {
      name: `${el.yAgg} of ${primaryMeasureName}`,
      data: categories.map((name, idx) => ({ name, y: values[idx] })),
      color: '#3b82f6',
      borderRadius: 4
    };
    const secondaryValues = values.map(v => Math.round(v * 0.74));
    const secondarySeries = el.yAxes[1]
      ? {
          name: `${el.yAgg} of ${el.yAxes[1].name}`,
          data: categories.map((name, idx) => ({ name, y: secondaryValues[idx] })),
          color: '#22c55e',
          borderRadius: 4
        }
      : null;
    const trendSeries = (el.enableCombination && (el.visType === 'column' || el.visType === 'bar'))
      ? {
          type: 'line',
          name: `Trend ${primaryMeasureName}`,
          data: values.map(v => Math.round(v * 0.82)),
          color: '#ef4444'
        }
      : null;

    this.highchartsLib.chart(container, {
      chart: { type: el.visType, backgroundColor: 'transparent' },
      title: { text: null },
      xAxis: {
        categories,
        visible: hasData,
        labels: {
          enabled: true,
          style: { color: '#94a3b8', fontSize: '10px' }
        }
      },
      yAxis: {
        title: { text: null },
        visible: hasData,
        labels: { style: { color: '#94a3b8', fontSize: '10px' } },
        gridLineColor: '#f1f5f9'
      },
      legend: { enabled: true, itemStyle: { fontSize: '10px', color: '#64748b' } },
      credits: { enabled: false },
      plotOptions: {
        series: {
          cursor: hasData ? 'pointer' : 'default',
          point: {
            events: {
              click: function (this: any) {
                const clicked = this?.category || this?.name || 'Selected';
                if (el.visType === 'pie-drilldown') return;
                self.openDrilldownFromPoint(el, String(clicked));
              }
            }
          },
          dataLabels: {
            enabled: dataLabelEnabled,
            align: el.labelPosition === 'Lft' ? 'right' : el.labelPosition === 'Rgt' ? 'left' : 'center',
            verticalAlign: el.labelPosition === 'Top' ? 'top' : el.labelPosition === 'Btm' ? 'bottom' : 'middle',
            style: { fontSize: '9px', textOutline: 'none' },
            formatter: function (this: any) {
              if (el.dataLabelOption === 'percentage') {
                return this.percentage ? `${this.percentage.toFixed(1)}%` : '';
              }
              return this.y;
            }
          }
        }
      },
      series: hasData
        ? [
            primarySeries,
            ...(secondarySeries && el.visType !== 'pie' ? [secondarySeries] : []),
            ...(trendSeries ? [trendSeries] : [])
          ]
        : []
    });
  }
}
