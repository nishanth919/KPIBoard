# KPI Chart Board - Functional Specification

## 1. Product Scope
The KPI Chart Board is an interactive dashboard builder for business users to create, edit, filter, drill down, and save KPI widgets across multiple pages.

### 1.1 Core capabilities
- Build dashboard pages with chart and text widgets.
- Configure chart visualization and field mapping from dataset LOVs.
- Apply page-level filters (dimension-based) across eligible charts.
- Drill down from chart points into tabular detail panel.
- Save chart-level and dashboard-level payloads (API placeholders).
- Support edit mode with guarded drag/drop and resize interactions.

### 1.2 In-scope datasets
- `Invoices`
- `Sales`
- `Transactions`

## 2. Functional Requirements

### 2.1 Dashboard and page management
- Dashboard loads from GET payload with `pages[]`.
- Dashboard name defaults to `Untitled` on reset/create flow.
- Dashboard name must be editable via double click.
- User can add pages; default naming: `Page 1`, `Page 2`, ...
- Page name must be editable via double click.
- Switching page should preserve each page widget list.

### 2.2 Widget lifecycle
- User can add chart or text widget.
- New chart starts with default config and can be edited from sidebar.
- Widget can be removed.
- Widget title auto-updates from selected axis/aggregation unless user manually overrides.

### 2.3 Chart configuration
- Visualization type selection (primary + more chart types).
- Dataset selection.
- Unified search across mapping fields.
- X Axis category mapping.
- Y Axis multi-select (max 2 metrics) with metric-wise aggregation.
- Optional Legend, Drill Down field, Columns field.
- Advanced options: label position, date column, condition string, limit, data label mode, combination toggle, sort by.

### 2.4 Filtering
- Top auto-date filter should refresh charts.
- Page filter picker should add common dimension columns across active charts.
- Each added filter column has value LOV and removable chip/dropdown.
- Non-eligible charts should show warning behavior.
- Filter values should impact chart rendering deterministically.

### 2.5 Drilldown
- Drilldown opens on chart point click (bar/slice/point).
- Drilldown panel appears below the source row in canvas.
- Drilldown must be page-scoped:
  - Page A drilldown should not appear on Page B.
  - Returning to Page A restores previous drilldown state.

### 2.6 Edit mode and interactions
- Default state: view mode.
- Drag/drop and resize allowed only in edit mode.
- Drop should reorder widgets and rearrange layout sequence.

### 2.7 Persistence
- `GET /dashboard` mock returns dashboard payload with pages.
- `POST /charts` mock logs chart payload.
- Dashboard save builds complete payload and logs output.
- Save should process dirty charts and reset edit mode.

## 3. Non-Functional Requirements
- Responsive UI for desktop web.
- Deterministic mock chart data for repeatable demos.
- Graceful fallback when library modules fail to load.
- Maintainable method-level separation of concerns in `app.ts`.

## 4. User Stories

### Epic A - Dashboard authoring
1. As a dashboard author, I want to create a new dashboard so I can start with an untitled template.
2. As a dashboard author, I want to rename dashboard/page using inline edit so I can apply business naming.
3. As a dashboard author, I want multiple pages so I can separate KPI contexts.

### Epic B - Widget design
4. As an analyst, I want to add chart/text widgets so I can present metrics and commentary.
5. As an analyst, I want to configure dimensions/measures/aggregations so chart meaning is correct.
6. As an analyst, I want advanced options (limit, labels, sorting) so visuals are presentation-ready.

### Epic C - Filtering and exploration
7. As a consumer, I want page filters so I can slice all relevant widgets consistently.
8. As a consumer, I want drilldown by clicking points so I can inspect underlying details.
9. As a consumer, I want drilldown state per page so context is preserved while navigating tabs.

### Epic D - Layout and persistence
10. As a dashboard editor, I want drag/drop reorder in edit mode so I can design layout safely.
11. As a dashboard editor, I want save/cancel flow so I can control publishing changes.
12. As an integrator, I want structured payloads so backend APIs can be wired later.

## 5. Task List with Method References

### 5.1 App initialization and library boot
- [ ] Load Highcharts core and drilldown module safely.
  - Methods: `ngOnInit`, `initializeLibraries`

### 5.2 Dashboard loading and mapping
- [ ] Fetch dashboard and map payload widgets to UI model.
  - Methods: `loadDashboardOnInit`, `mapWidgetPayloadToElement`, `resolveFieldByName`
- [ ] Seed default widget when load fails.
  - Methods: `addDefaultHighchartsDrilldownWidget`

### 5.3 Dashboard/page editing
- [ ] Edit dashboard name inline.
  - Methods: `beginDashboardNameEdit`, `commitDashboardNameEdit`
- [ ] Add/switch/rename pages and keep page widget state synced.
  - Methods: `addPage`, `switchPage`, `beginPageNameEdit`, `commitPageNameEdit`, `syncCurrentPageWidgets`, `isCurrentPage`
- [ ] Create/reset dashboard state.
  - Methods: `resetDashboard`

### 5.4 Widget operations
- [ ] Add new chart/text widgets.
  - Methods: `addNewElement`, `addFromMenu`, `addPageFromMenu`
- [ ] Remove widgets and cleanup related transient state.
  - Methods: `removeElement`
- [ ] Open property sidebar contextually.
  - Methods: `openProperties`, `selectElement`, `toggleSidebar`

### 5.5 Field mapping and configuration
- [ ] Dataset, axis, legend, drilldown, columns mapping.
  - Methods: `onDatasetChange`, `onDimensionSelect`, `onMeasureSelect`, `findFieldById`
- [ ] Multi-metric management (max 2).
  - Methods: `addMetric`, `removeMeasure`, `getSelectedMeasureIds`
- [ ] Aggregation by metric.
  - Methods: `getYAgg`, `onMeasureAggChange`, `onAggChange`
- [ ] Search/filter LOV values.
  - Methods: `getFieldSearch`, `setFieldSearch`, `getFilteredDimensionFields`, `getFilteredMeasureFields`
- [ ] Title automation and manual override.
  - Methods: `updateTitle`, `applyAutoChartTitle`, `getAutoChartTitle`

### 5.6 Advanced options
- [ ] Chart type and more-chart mapping.
  - Methods: `updateVisType`, `onMoreChartTypeSelect`
- [ ] Limit/data label/combination/sort/label position.
  - Methods: `onLimitChange`, `onDataLabelOptionChange`, `onCombinationToggle`, `onSortByChange`, `setLabelPosition`

### 5.7 Filter bar and page filters
- [ ] Apply top date filter refresh.
  - Methods: `onTopDateFilterChange`, `refreshAllCharts`
- [ ] Manage page filter picker and selected columns.
  - Methods: `togglePageFilterPicker`, `clearPageFilterPickerSelection`, `togglePendingPageFilter`, `applyPageFilterSelection`, `isPendingPageFilterSelected`
- [ ] Filter values and chart eligibility.
  - Methods: `onPageFilterValueChange`, `removePageFilter`, `refreshChartsForPageFilter`, `isChartEligibleForFilter`, `showIneligibleFilterWarning`, `getCommonFilterColumns`, `getFilterOptionsForColumn`, `getActiveChartElements`, `getDimensionsForDataset`

### 5.8 Drilldown behavior
- [ ] Open drilldown on point click and show tabular mock data.
  - Methods: `openDrilldownFromPoint`, `getDrilldownRows`
- [ ] Page-scoped drilldown persistence.
  - Methods: `openDrilldownFromPoint`, `switchPage`, `closeDrilldown`
- [ ] Drilldown row insertion and sizing.
  - Methods: `shouldRenderDrilldownAfter`, `getDrilldownPanelRowSpan`, `buildRowMap`, `buildRowEndMap`, `getRowForElementId`, `getRowEndElementId`

### 5.9 Drag/drop + resize
- [ ] Restrict drag/resize to edit mode.
  - Methods: `startDrag`, `startResize`, `onGlobalMouseMove`, `onGlobalMouseUp`
- [ ] Reorder widgets on drop.
  - Methods: `reorderElementsOnDrop`, `getDropTargetId`, `getTransform`

### 5.10 Save workflows
- [ ] Build chart payload and save single/dirty charts.
  - Methods: `buildChartPostPayload`, `saveChart`, `saveAllDirtyCharts`, `markChartDirty`, `markChartSaved`, `isChartDirty`, `hasUnsavedChartChanges`
- [ ] Build dashboard payload and save dashboard.
  - Methods: `buildDashboardSavePayload`, `saveDashboard`

### 5.11 Chart rendering engine
- [ ] Render base charts and apply filters/sorting/limits.
  - Methods: `refreshChart`, `getMockDimensionValues`
- [ ] Counter and pie-drilldown specific rendering.
  - Methods: `refreshChart`, `aggregateValues`, `formatCounterValue`
- [ ] Deferred render scheduling.
  - Methods: `scheduleChartRenderById`

### 5.12 Service integration placeholders
- [ ] Dashboard GET mock and response schema.
  - File: `services/chart-persistence.service.ts`
  - Method: `getDashboard`
- [ ] Chart POST mock.
  - File: `services/chart-persistence.service.ts`
  - Method: `saveChart`

## 6. Suggested Sprint Breakdown
- Sprint 1: Dashboard/page model, load/save payload structure.
- Sprint 2: Widget config and advanced options.
- Sprint 3: Filters + drilldown with page scoping.
- Sprint 4: Drag/drop polish, validation, API wiring.

## 7. Acceptance Checklist
- [ ] Dashboard and page rename works via double click.
- [ ] Add page works with default naming and switch behavior.
- [ ] Filters bar layout keeps `+ Add Page Filter` pinned right.
- [ ] Drilldown does not leak across pages.
- [ ] Save payload includes `pages[]` and `page_filters[]`.
- [ ] Drag/drop works only in edit mode and reorders widgets.

## 8. Open Integration Items
- Replace console placeholders with real API calls.
- Add backend validation for payload schema.
- Add route-level resolver for dashboard bootstrap.
- Add unit tests for mapping/filter/drilldown/page-switch logic.
