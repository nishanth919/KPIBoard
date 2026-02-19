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

@Injectable({ providedIn: 'root' })
export class ChartPersistenceService {
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
