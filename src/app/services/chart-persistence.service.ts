import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface ChartPostPayload {
  id: string;
  title: string;
  visType: string;
  xAxis: string | null;
  yAxis: string | null;
  yAxes?: string[];
  yAggByMeasure?: Record<string, 'Sum' | 'Avg' | 'Min' | 'Max'>;
  yAgg: 'Sum' | 'Avg' | 'Min' | 'Max';
  labelPosition: 'Top' | 'Btm' | 'Lft' | 'Rgt';
  width: number;
  height: number;
  dataset: string;
  legend?: string | null;
  drillDownField?: string | null;
  columnsField?: string | null;
  dateColumn?: string | null;
  conditionString?: string;
  limit?: number;
  dataLabelOption?: 'showValues' | 'percentage' | 'none';
  enableCombination?: boolean;
  sortBy?: string | null;
}

export interface ChartSaveResponse {
  success: boolean;
  message: string;
  savedAt: string;
}

export interface DashboardWidgetPayload {
  id: string;
  type: 'chart' | 'text';
  visType: string;
  title: string;
  dataset: 'Invoices' | 'Sales' | 'Transactions';
  xAxis: string | null;
  yAxis: string | null;
  yAxes: string[];
  yAgg: 'Sum' | 'Avg' | 'Min' | 'Max';
  yAggByMeasure: Record<string, 'Sum' | 'Avg' | 'Min' | 'Max'>;
  legend: string | null;
  drillDownField: string | null;
  columnsField: string | null;
  dateColumn: string | null;
  conditionString: string;
  limit: number;
  dataLabelOption: 'showValues' | 'percentage' | 'none';
  enableCombination: boolean;
  sortBy: string | null;
  labelPosition: 'Top' | 'Btm' | 'Lft' | 'Rgt';
  width: number;
  height: number;
}

export interface DashboardGetResponse {
  id: string;
  dashboardName: string;
  page_filters: Array<{ column: string; value: string }>;
  datasets_used: string[];
  widgetlist: DashboardWidgetPayload[];
  createdBy: string;
  createdDate: string;
  updateBy: string;
  UpdateDate: string;
}

@Injectable({ providedIn: 'root' })
export class ChartPersistenceService {
  getDashboard(): Observable<DashboardGetResponse> {
    const payload: DashboardGetResponse = {
      id: 'db-1771492861417',
      dashboardName: 'Sales Metrics Dashboard',
      page_filters: [],
      datasets_used: ['Sales', 'Invoices'],
      widgetlist: [
        {
          id: 'el-jku7cm376',
          type: 'chart',
          visType: 'pie-drilldown',
          title: 'Sales by Region',
          dataset: 'Sales',
          xAxis: 'Region',
          yAxis: 'Total Sales',
          yAxes: ['Total Sales'],
          yAgg: 'Sum',
          yAggByMeasure: { sm1: 'Sum' },
          legend: null,
          drillDownField: null,
          columnsField: null,
          dateColumn: null,
          conditionString: '',
          limit: 4,
          dataLabelOption: 'showValues',
          enableCombination: false,
          sortBy: null,
          labelPosition: 'Btm',
          width: 6,
          height: 4
        },
        {
          id: 'el-tq5r00o7z',
          type: 'chart',
          visType: 'column',
          title: 'Total Sales by Category',
          dataset: 'Sales',
          xAxis: 'Category',
          yAxis: 'Total Sales',
          yAxes: ['Total Sales'],
          yAgg: 'Sum',
          yAggByMeasure: { sm1: 'Sum' },
          legend: null,
          drillDownField: null,
          columnsField: null,
          dateColumn: null,
          conditionString: '',
          limit: 4,
          dataLabelOption: 'showValues',
          enableCombination: false,
          sortBy: null,
          labelPosition: 'Btm',
          width: 3,
          height: 4
        },
        {
          id: 'el-q1cm4lq2q',
          type: 'text',
          visType: 'column',
          title: 'Info Text',
          dataset: 'Invoices',
          xAxis: null,
          yAxis: null,
          yAxes: [],
          yAgg: 'Sum',
          yAggByMeasure: {},
          legend: null,
          drillDownField: null,
          columnsField: null,
          dateColumn: null,
          conditionString: '',
          limit: 4,
          dataLabelOption: 'showValues',
          enableCombination: false,
          sortBy: null,
          labelPosition: 'Btm',
          width: 2,
          height: 1
        },
        {
          id: 'el-us4sbscxc',
          type: 'chart',
          visType: 'counter',
          title: 'Invoice Amount by Customer Name',
          dataset: 'Invoices',
          xAxis: 'Customer Name',
          yAxis: 'Invoice Amount',
          yAxes: ['Invoice Amount'],
          yAgg: 'Sum',
          yAggByMeasure: { im1: 'Sum' },
          legend: null,
          drillDownField: null,
          columnsField: null,
          dateColumn: null,
          conditionString: '',
          limit: 4,
          dataLabelOption: 'showValues',
          enableCombination: false,
          sortBy: null,
          labelPosition: 'Btm',
          width: 2,
          height: 2
        }
      ],
      createdBy: 'system.user',
      createdDate: '2026-02-19T09:21:01.417Z',
      updateBy: 'system.user',
      UpdateDate: '2026-02-19T09:21:01.417Z'
    };
    console.log('[DASHBOARD_GET_API_PLACEHOLDER] GET /dashboard response:', payload);
    return of(payload);
  }

  saveChart(payload: ChartPostPayload): Observable<ChartSaveResponse> {
    // Placeholder for API integration.
    console.log('[CHART_SAVE_API_PLACEHOLDER] POST /charts payload:', payload);
    return of({
      success: true,
      message: 'Mock chart save successful',
      savedAt: new Date().toISOString()
    });
  }
}
