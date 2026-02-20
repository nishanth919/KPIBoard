import { Component, OnInit, signal, computed, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import Highcharts from 'highcharts';
import { ChartPersistenceService, type ChartPostPayload, type DashboardGetResponse, type DashboardWidgetPayload } from './services/chart-persistence.service';

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
  yAggByMeasure: Record<string, 'Sum' | 'Avg' | 'Min' | 'Max'>;
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

interface DashboardSavePayload {
  id: string;
  dashboardName: string;
  page_filters: PageFilterItem[];
  datasets_used: string[];
  pages: Array<{
    id: string;
    pagename: string;
    widgetlist: any[];
  }>;
  createdBy: string;
  createdDate: string;
  updateBy: string;
  UpdateDate: string;
}

interface DashboardPageState {
  id: string;
  pagename: string;
  widgetlist: DashboardElement[];
}


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {
  private readonly chartPersistenceService = inject(ChartPersistenceService);
  private highchartsLib: any = Highcharts;
  private drilldownModuleReady = false;

  sidebarOpened = signal(false);
  selectedId = signal<string | null>(null);
  elements = signal<DashboardElement[]>([]);
  dashboardName = signal('Sales Metrics Dashboard');
  editingDashboardName = signal(false);
  dashboardNameDraft = signal('');
  pages = signal<DashboardPageState[]>([]);
  currentPageId = signal<string | null>(null);
  editingPageId = signal<string | null>(null);
  pageNameDraft = signal('');
  activeTab: 'PROPERTIES' | 'ADVANCED' = 'PROPERTIES';
  activeDrilldown = signal<DrilldownState | null>(null);
  drilldownByPage = signal<Record<string, DrilldownState | null>>({});
  dirtyChartIds = signal<Set<string>>(new Set());
  addMenuOpen = signal(false);
  pageFilterPickerOpen = signal(false);
  pendingPageFilterColumns = signal<Set<string>>(new Set());
  pageFilters = signal<PageFilterItem[]>([]);
  editMode = signal(false);
  fieldSearchByChart: Record<string, string> = {};
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
  moreVisTypes = [
    { id: 'gauge', name: 'Gauge Chart' },
    { id: 'bullet', name: 'Bullet Chart' },
    { id: 'timeseries', name: 'Time Series' },
    { id: 'waterfall', name: 'Waterfall' },
    { id: 'heatmap', name: 'Heat Map' },
    { id: 'treemap', name: 'Tree Map' }
  ];

  selectedElement = computed(() => this.elements().find(e => e.id === this.selectedId()));

  constructor() {
    console.log('App initialized:');
  }

  async ngOnInit() {
    await this.initializeLibraries();
    this.loadDashboardOnInit();
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
      yAggByMeasure: { sm1: 'Sum' },
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
    const defaultPage: DashboardPageState = {
      id: 'page-1',
      pagename: 'Page 1',
      widgetlist: [defaultChart]
    };
    this.pages.set([defaultPage]);
    this.currentPageId.set(defaultPage.id);
    this.dashboardName.set('Sales Metrics Dashboard');
    this.markChartSaved(id);
    this.scheduleChartRenderById(id);
  }

  resolveFieldByName(
    dataset: 'Invoices' | 'Sales' | 'Transactions',
    fieldName: string | null,
    expectedType?: 'dimension' | 'measure'
  ): Field | null {
    if (!fieldName) return null;
    const match = (this.datasets[dataset] || []).find(field => field.name === fieldName) || null;
    if (!match) return null;
    if (expectedType && match.type !== expectedType) return null;
    return match;
  }

  mapWidgetPayloadToElement(widget: DashboardWidgetPayload): DashboardElement {
    const dataset = widget.dataset;
    const yAxes = (widget.yAxes || [])
      .map(name => this.resolveFieldByName(dataset, name, 'measure'))
      .filter((field): field is Field => !!field);

    const mapped: DashboardElement = {
      id: widget.id,
      type: widget.type,
      visType: widget.visType,
      dataset,
      xAxis: this.resolveFieldByName(dataset, widget.xAxis, 'dimension'),
      yAxis: this.resolveFieldByName(dataset, widget.yAxis, 'measure'),
      yAxes,
      yAggByMeasure: widget.yAggByMeasure || {},
      legend: this.resolveFieldByName(dataset, widget.legend, 'dimension'),
      drillDownField: this.resolveFieldByName(dataset, widget.drillDownField, 'dimension'),
      columnsField: this.resolveFieldByName(dataset, widget.columnsField, 'dimension'),
      yAgg: widget.yAgg || 'Sum',
      dateColumn: this.resolveFieldByName(dataset, widget.dateColumn, 'dimension'),
      conditionString: widget.conditionString || '',
      limit: typeof widget.limit === 'number' ? widget.limit : 4,
      dataLabelOption: widget.dataLabelOption || 'showValues',
      enableCombination: !!widget.enableCombination,
      sortBy: this.resolveFieldByName(dataset, widget.sortBy, 'dimension') || this.resolveFieldByName(dataset, widget.sortBy, 'measure'),
      content: widget.type === 'text' ? (widget.title || 'Info') : '',
      fontSize: 14,
      color: '#1e293b',
      width: widget.width || 4,
      height: widget.height || 3,
      title: widget.title || 'New Chart',
      labelPosition: widget.labelPosition || 'Btm',
      userEditedTitle: true,
      xPos: 0,
      yPos: 0,
      showTable: false
    };

    if (!mapped.yAxis && mapped.yAxes.length > 0) {
      mapped.yAxis = mapped.yAxes[0];
    }

    return mapped;
  }

  loadDashboardOnInit() {
    this.chartPersistenceService.getDashboard().subscribe({
      next: (response: DashboardGetResponse) => {
        this.dashboardName.set(response.dashboardName || 'Untitled');
        this.editingDashboardName.set(false);
        this.editingPageId.set(null);
        const mappedPages: DashboardPageState[] = (response.pages || []).map((page, idx) => ({
          id: page.id || `page-${idx + 1}`,
          pagename: page.pagename || `Page ${idx + 1}`,
          widgetlist: (page.widgetlist || []).map(widget => this.mapWidgetPayloadToElement(widget))
        }));
        this.pages.set(mappedPages);
        const firstPage = mappedPages[0];
        this.currentPageId.set(firstPage?.id || null);
        const mappedElements = firstPage?.widgetlist || [];
        this.elements.set(mappedElements);
        this.drilldownByPage.set({});
        this.activeDrilldown.set(null);
        this.pageFilters.set(response.page_filters || []);
        this.selectedMeasureIdsByChart = {};
        mappedElements.forEach(el => {
          if (el.type === 'chart') {
            this.selectedMeasureIdsByChart[el.id] = el.yAxes.map(field => field.id);
          }
        });
        this.dirtyChartIds.set(new Set());
        if (mappedElements.length > 0) {
          this.selectElement(mappedElements[0].id);
        }
        setTimeout(() => this.refreshAllCharts(), 100);
      },
      error: (error) => {
        console.error('[DASHBOARD_GET_ERROR] Failed to load dashboard:', error);
        if (this.elements().length === 0) {
          this.addDefaultHighchartsDrilldownWidget();
        }
      }
    });
  }

  closeDrilldown() {
    this.activeDrilldown.set(null);
    const pageId = this.currentPageId();
    if (!pageId) return;
    this.drilldownByPage.update(current => ({ ...current, [pageId]: null }));
  }

  enterEditMode() {
    this.editMode.set(true);
  }

  cancelEditMode(event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.addMenuOpen.set(false);
    this.loadDashboardOnInit();
    this.editMode.set(false);
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

  addPageFromMenu(event: MouseEvent) {
    event.stopPropagation();
    this.addMenuOpen.set(false);
    this.addPage();
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
    this.drilldownByPage.set({});
    this.dirtyChartIds.set(new Set());
    this.fieldSearchByChart = {};
    this.selectedMeasureIdsByChart = {};
    this.draggingElement = null;
    this.resizingElement = null;
    this.sidebarOpened.set(false);
    this.topFilterDateRange = 'This Week';
    this.topFilterService = 'All';
    this.topFilterPost = 'All';
    this.dashboardName.set('Untitled');
    this.editingDashboardName.set(false);
    const firstPage: DashboardPageState = { id: `page-${Date.now()}`, pagename: 'Page 1', widgetlist: [] };
    this.pages.set([firstPage]);
    this.currentPageId.set(firstPage.id);
    this.editMode.set(false);
  }

  beginDashboardNameEdit() {
    this.dashboardNameDraft.set(this.dashboardName());
    this.editingDashboardName.set(true);
  }

  commitDashboardNameEdit() {
    const next = this.dashboardNameDraft().trim();
    if (next) this.dashboardName.set(next);
    this.editingDashboardName.set(false);
  }

  beginPageNameEdit(page: DashboardPageState) {
    this.pageNameDraft.set(page.pagename);
    this.editingPageId.set(page.id);
  }

  commitPageNameEdit(pageId: string) {
    const next = this.pageNameDraft().trim();
    if (next) {
      this.pages.update(items => items.map(page => page.id === pageId ? { ...page, pagename: next } : page));
    }
    this.editingPageId.set(null);
  }

  isCurrentPage(pageId: string): boolean {
    return this.currentPageId() === pageId;
  }

  syncCurrentPageWidgets() {
    const currentId = this.currentPageId();
    if (!currentId) return;
    const currentWidgets = this.elements();
    this.pages.update(items => items.map(page => page.id === currentId ? { ...page, widgetlist: currentWidgets } : page));
  }

  switchPage(pageId: string) {
    if (this.currentPageId() === pageId) return;
    this.syncCurrentPageWidgets();
    const target = this.pages().find(page => page.id === pageId);
    if (!target) return;
    this.currentPageId.set(pageId);
    this.elements.set(target.widgetlist || []);
    this.activeDrilldown.set(this.drilldownByPage()[pageId] || null);
    this.selectedMeasureIdsByChart = {};
    this.elements().forEach(el => {
      if (el.type === 'chart') {
        this.selectedMeasureIdsByChart[el.id] = el.yAxes.map(field => field.id);
      }
    });
    this.selectedId.set(this.elements()[0]?.id || null);
    setTimeout(() => this.refreshAllCharts(), 80);
  }

  addPage() {
    this.syncCurrentPageWidgets();
    const nextIndex = this.pages().length + 1;
    const newPage: DashboardPageState = {
      id: `page-${Date.now()}-${nextIndex}`,
      pagename: `Page ${nextIndex}`,
      widgetlist: []
    };
    this.pages.update(items => [...items, newPage]);
    this.switchPage(newPage.id);
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
    if (!this.currentPageId() && this.pages().length > 0) {
      this.currentPageId.set(this.pages()[0].id);
    }
    const id = 'el-' + Math.random().toString(36).substr(2, 9);
    const newEl: DashboardElement = {
      id, type,
      visType: 'column', dataset: 'Invoices', xAxis: null, yAxis: null, yAxes: [], yAggByMeasure: {}, legend: null, drillDownField: null, columnsField: null, yAgg: 'Sum',
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
    this.syncCurrentPageWidgets();
  }

  selectElement(id: string) {
    this.selectedId.set(id);
  }

  removeElement(id: string) {
    this.elements.update(prev => prev.filter(e => e.id !== id));
    if (this.selectedId() === id) this.selectedId.set(null);
    if (this.activeDrilldown()?.sourceElementId === id) this.closeDrilldown();
    delete this.selectedMeasureIdsByChart[id];
    delete this.fieldSearchByChart[id];
    this.markChartSaved(id);
    this.syncCurrentPageWidgets();
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

  getFieldSearch(chartId: string): string {
    return this.fieldSearchByChart[chartId] || '';
  }

  setFieldSearch(chartId: string, value: string) {
    this.fieldSearchByChart[chartId] = value || '';
  }

  getFilteredDimensionFields(el: DashboardElement): Field[] {
    const term = this.getFieldSearch(el.id).toLowerCase().trim();
    const source = this.getDimensionFields(el);
    if (!term) return source;
    return source.filter(field => field.name.toLowerCase().includes(term));
  }

  getFilteredMeasureFields(el: DashboardElement): Field[] {
    const term = this.getFieldSearch(el.id).toLowerCase().trim();
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
    el.yAggByMeasure = {};
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

    const nextAggMap: Record<string, 'Sum' | 'Avg' | 'Min' | 'Max'> = {};
    selectedFields.forEach(field => {
      nextAggMap[field.id] = el.yAggByMeasure[field.id] || el.yAgg || 'Sum';
    });
    el.yAxes = selectedFields;
    el.yAxis = selectedFields.length > 0 ? selectedFields[0] : null;
    el.yAggByMeasure = nextAggMap;
    this.selectedMeasureIdsByChart[el.id] = selectedFields.map(field => field.id);
    this.applyAutoChartTitle(el);
    this.refreshChart(el);
    this.markChartDirty(el.id);
  }

  addMetric(el: DashboardElement) {
    if (el.yAxes.length >= 2) return;
    const selectedIds = new Set(el.yAxes.map(item => item.id));
    const next = this.getFilteredMeasureFields(el).find(field => !selectedIds.has(field.id));
    if (!next) return;
    this.onMeasureSelect(el, [...el.yAxes.map(item => item.id), next.id]);
  }

  removeMeasure(el: DashboardElement, measureId: string) {
    const remaining = el.yAxes.filter(item => item.id !== measureId).map(item => item.id);
    this.onMeasureSelect(el, remaining);
  }

  getYAgg(el: DashboardElement, measureId: string): 'Sum' | 'Avg' | 'Min' | 'Max' {
    return el.yAggByMeasure[measureId] || el.yAgg || 'Sum';
  }

  onMeasureAggChange(el: DashboardElement, measureId: string, agg: 'Sum' | 'Avg' | 'Min' | 'Max') {
    el.yAggByMeasure[measureId] = agg;
    if (el.yAxis?.id === measureId) {
      el.yAgg = agg;
    }
    this.applyAutoChartTitle(el);
    this.refreshChart(el);
    this.markChartDirty(el.id);
  }

  onMoreChartTypeSelect(type: string) {
    if (!type) return;
    const el = this.selectedElement();
    if (!el || el.type !== 'chart') return;
    if (type === 'timeseries') {
      el.visType = 'line';
    } else if (type === 'waterfall' || type === 'gauge' || type === 'bullet') {
      el.visType = 'column';
    } else if (type === 'heatmap' || type === 'treemap') {
      el.visType = 'area';
    } else {
      el.visType = type;
    }
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
    if (!this.editMode()) return;
    event.stopPropagation();
    this.selectElement(el.id);
    this.draggingElement = el;
    this.dragOffset = {
      x: event.clientX - (el.xPos || 0),
      y: event.clientY - (el.yPos || 0)
    };
  }

  startResize(event: MouseEvent, el: DashboardElement) {
    if (!this.editMode()) return;
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
    if (!this.editMode()) return;
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

  @HostListener('window:mouseup', ['$event'])
  onGlobalMouseUp(event: MouseEvent) {
    if (!this.editMode()) {
      this.draggingElement = null;
      this.resizingElement = null;
      return;
    }
    const dragged = this.draggingElement;
    const resized = this.resizingElement;

    if (this.draggingElement) {
      this.reorderElementsOnDrop(this.draggingElement.id, event.clientX, event.clientY);
      // Snap to grid
      const container = document.getElementById('grid-canvas');
      if (container) {
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

  reorderElementsOnDrop(draggedId: string, clientX: number, clientY: number) {
    const container = document.getElementById('grid-canvas');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const isInsideGrid =
      clientX >= containerRect.left &&
      clientX <= containerRect.right &&
      clientY >= containerRect.top &&
      clientY <= containerRect.bottom;
    if (!isInsideGrid) return;

    const current = this.elements();
    const fromIndex = current.findIndex(el => el.id === draggedId);
    if (fromIndex < 0) return;

    const targetId = this.getDropTargetId(draggedId, clientX, clientY);
    if (!targetId) return;
    const toIndex = current.findIndex(el => el.id === targetId);
    if (toIndex < 0 || toIndex === fromIndex) return;

    const reordered = [...current];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    this.elements.set(reordered);
  }

  getDropTargetId(draggedId: string, clientX: number, clientY: number): string | null {
    const candidates = this.elements()
      .filter(el => el.id !== draggedId)
      .map(el => {
        const node = document.getElementById(el.id);
        if (!node) return null;
        return { id: el.id, rect: node.getBoundingClientRect() };
      })
      .filter((entry): entry is { id: string; rect: DOMRect } => !!entry);

    if (!candidates.length) return null;

    const hovered = candidates.find(item =>
      clientX >= item.rect.left &&
      clientX <= item.rect.right &&
      clientY >= item.rect.top &&
      clientY <= item.rect.bottom
    );
    if (hovered) return hovered.id;

    const nearest = candidates
      .map(item => {
        const cx = item.rect.left + item.rect.width / 2;
        const cy = item.rect.top + item.rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        return { id: item.id, dist: dx * dx + dy * dy };
      })
      .sort((a, b) => a.dist - b.dist)[0];

    return nearest?.id || null;
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
    const pageId = this.currentPageId();
    if (pageId) {
      this.drilldownByPage.update(current => ({
        ...current,
        [pageId]: this.activeDrilldown()
      }));
    }
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
      yAggByMeasure: el.yAggByMeasure,
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

  buildDashboardSavePayload(): DashboardSavePayload {
    const now = new Date().toISOString();
    this.syncCurrentPageWidgets();
    const pagesPayload = this.pages().map(page => ({
      id: page.id,
      pagename: page.pagename,
      widgetlist: page.widgetlist.map(el => ({
        id: el.id,
        type: el.type,
        visType: el.visType,
        title: el.title,
        dataset: el.dataset,
        xAxis: el.xAxis?.name || null,
        yAxis: el.yAxes[0]?.name || el.yAxis?.name || null,
        yAxes: el.yAxes.map(y => y.name),
        yAgg: el.yAgg,
        yAggByMeasure: el.yAggByMeasure,
        legend: el.legend?.name || null,
        drillDownField: el.drillDownField?.name || null,
        columnsField: el.columnsField?.name || null,
        dateColumn: el.dateColumn?.name || null,
        conditionString: el.conditionString,
        limit: el.limit,
        dataLabelOption: el.dataLabelOption,
        enableCombination: el.enableCombination,
        sortBy: el.sortBy?.name || null,
        labelPosition: el.labelPosition,
        width: el.width,
        height: el.height
      }))
    }));

    return {
      id: `db-${Date.now()}`,
      dashboardName: this.dashboardName(),
      page_filters: this.pageFilters(),
      datasets_used: Array.from(new Set(pagesPayload.flatMap(page => page.widgetlist.map((w: any) => w.dataset)))),
      pages: pagesPayload,
      createdBy: 'system.user',
      createdDate: now,
      updateBy: 'system.user',
      UpdateDate: now
    };
  }

  saveDashboard(event?: MouseEvent) {
    if (event) event.stopPropagation();
    const payload = this.buildDashboardSavePayload();
    console.log('[DASHBOARD_SAVE_PAYLOAD]', payload);
    this.saveAllDirtyCharts();
    this.editMode.set(false);
    this.addMenuOpen.set(false);
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

      const primaryAgg = this.getYAgg(el, el.yAxes[0].id);
      const current = this.aggregateValues(values, primaryAgg);
      const trendSeed = el.yAxes[0].name.length + (el.limit || 0);
      const trendFactor = 0.82 + (trendSeed % 7) / 25; // deterministic 0.82..1.06
      const previous = current * trendFactor;
      const pctDelta = previous === 0 ? 0 : ((current - previous) / previous) * 100;
      const isUp = pctDelta >= 0;
      const pctLabel = `${isUp ? '+' : ''}${pctDelta.toFixed(1)}%`;
      const counterTitle = `${primaryAgg} of ${el.yAxes[0].name}`;

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
      name: `${this.getYAgg(el, el.yAxes[0].id)} of ${primaryMeasureName}`,
      data: categories.map((name, idx) => ({ name, y: values[idx] })),
      color: '#3b82f6',
      borderRadius: 4
    };
    const secondaryValues = values.map(v => Math.round(v * 0.74));
    const secondarySeries = el.yAxes[1]
      ? {
          name: `${this.getYAgg(el, el.yAxes[1].id)} of ${el.yAxes[1].name}`,
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
