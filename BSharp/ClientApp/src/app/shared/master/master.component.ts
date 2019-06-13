import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { merge, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { ApiService } from '~/app/data/api.service';
import { DtoForSaveKeyBase } from '~/app/data/dto/dto-for-save-key-base';
import { GetResponse } from '~/app/data/dto/get-response';
import { TemplateArguments_Format } from '~/app/data/dto/template-arguments';
import { addToWorkspace, downloadBlob } from '~/app/data/util';
import {
  MasterDetailsStore,
  MasterStatus,
  WorkspaceService,
  NodeInfo,
  MasterDisplayMode,
  TreeRefreshMode
} from '~/app/data/workspace.service';
import { FlatTreeControl } from '@angular/cdk/tree';

enum SearchView {
  tiles = 'tiles',
  table = 'table'
}


@Component({
  selector: 'b-master',
  templateUrl: './master.component.html',
  styleUrls: ['./master.component.scss']
})
export class MasterComponent implements OnInit, OnDestroy {

  private _apiEndpoint: string;
  private alreadyInit = false;

  @Input()
  masterCrumb: string;

  @Input()
  set apiEndpoint(v: string) {
    if (this._apiEndpoint !== v) {

      // this property defines a whole new screen from the POV of the user
      // when this property changes it is equivalent to a screen closing and
      // and another screen opening even though Angular may reuse the same
      // component and never call ngOnDestroy and ngOnInit. So we call them
      // manually here if this is not the first time this property is set
      // to simulate a screen closing and opening again
      if (this.alreadyInit) {
        this.ngOnDestroy();
      }

      this._apiEndpoint = v;

      if (this.alreadyInit) {
        this.ngOnInit();
      }
    }
  }

  get apiEndpoint(): string {
    return this._apiEndpoint;
  }

  @Input()
  viewId: string; // for the permissions

  @Input()
  tileTemplate: TemplateRef<any>;

  @Input()
  tableDescriptionColumnTemplate: TemplateRef<any>;

  // @Input()
  // treeNodeTemplate: TemplateRef<any>;

  @Input()
  tableColumnTemplates: {
    name: string,
    headerTemplate: TemplateRef<any>,
    rowTemplate: TemplateRef<any>,
    weight: string
  }[] = [];

  @Input()
  tableColumnPaths: string[];

  @Input()
  showCreateButton = true;

  @Input()
  showImportButton = true;

  @Input()
  showExportButton = true;

  @Input()
  showDeleteButton = true;

  @Input()
  allowMultiselect = true;

  @Input()
  enableTreeView = false;

  @Input()
  inactiveFilter = 'IsActive eq true';

  @Input()
  multiselectActions: {
    template: TemplateRef<any>,
    action: (p: (string | number)[]) => Observable<any>,
    requiresUpdatePermission: boolean
  }[] = [];

  @Input()
  includeInactiveLabel: string;

  @Input()
  expand: string;

  @Input()
  filterDefinition: {
    [groupName: string]: {
      template: TemplateRef<any>,
      expression: string
    }[]
  } = {};

  @Input()
  additionalCommands: TemplateRef<any>[]; // TODO

  @Input() // popup: limits the tiles to only 2 per row, hides import, export and multiselect
  mode: 'popup' | 'screen' = 'screen';

  @Input()
  exportPageSize = 10000;

  @Input()
  exportFileName: string;

  @Output()
  select = new EventEmitter<number | string>();

  @Output()
  create = new EventEmitter<void>();

  @Output()
  cancel = new EventEmitter<void>();

  @ViewChild('errorModal')
  public errorModal: TemplateRef<any>;

  private PAGE_SIZE = 25;
  private localState = new MasterDetailsStore();  // Used in popup mode
  private searchChanged$ = new Subject<string>();
  private notifyFetch$ = new Subject();
  private notifyDestruct$ = new Subject<void>();
  private _formatChoices: { name: string, value: any }[];
  private originalTableColumnPaths: string[];
  private _tableColumnPathsAndExtras: string[];
  private crud = this.api.crudFactory(this.apiEndpoint, this.notifyDestruct$); // Just for intellisense

  public searchView: SearchView;
  public checked = {};
  public exportFormat: 'csv' | 'xlsx';
  public exportSkip = 0;
  public showExportSpinner = false;
  public exportErrorMessage: string;
  public actionErrorMessage: string;
  public actionValidationErrors: { [id: string]: string[] } = {};


  ////////////////// TREE EXPERIMENT

  public treeControl = new FlatTreeControl<NodeInfo>(node => node.level - 1, node => node.hasChildren);

  showTreeNode(node: NodeInfo) {
    const parent = node.parent;
    return !parent || (parent.isExpanded && this.showTreeNode(parent));
  }

  public get treeNodes(): NodeInfo[] {
    return this.state.treeNodes;
  }

  public onExpand(node: NodeInfo): void {
    node.isExpanded = !node.isExpanded;
    if (node.isExpanded && node.status !== MasterStatus.loaded &&
      node.status !== MasterStatus.loading && !this.searchOrFilter) {
      this.fetchNodeChildren(node);
    }
  }

  public paddingLeft(node: NodeInfo): string {
    return this.workspace.ws.isRtl ? '0' : (this.treeControl.getLevel(node) * 30) + 'px';
  }
  public paddingRight(node: NodeInfo): string {
    return this.workspace.ws.isRtl ? (this.treeControl.getLevel(node) * 30) + 'px' : '0';
  }

  public flipNode(node: NodeInfo): string {
    // this is to flip the UI icons in RTL
    return this.workspace.ws.isRtl && !node.isExpanded ? 'horizontal' : null;
  }

  public rotateNode(node: NodeInfo): number {
    return node.isExpanded ? 90 : 0;
  }

  public showNodeSpinner(node: NodeInfo): boolean {
    return node.status === MasterStatus.loading;
  }

  public hasChildren(node: NodeInfo): boolean {
    return node.hasChildren;
  }

  ////////////////// END - TREE EXPERIMENT






  constructor(private workspace: WorkspaceService, private api: ApiService, private router: Router,
    private route: ActivatedRoute, private translate: TranslateService, public modalService: NgbModal) {

    // Use some RxJS magic to refresh the data as the user changes the parameters
    const searchBoxSignals = this.searchChanged$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.state.skip = 0),
      tap(() => this.exportSkip = 0),
    );

    const otherSignals = this.notifyFetch$;
    const allSignals = merge(searchBoxSignals, otherSignals);
    allSignals.pipe(
      switchMap(() => this.doFetch())
    ).subscribe();
  }

  ngOnInit() {

    // Default search view
    this.searchView = (!!window && window.innerWidth >= 1050) ? SearchView.table : SearchView.tiles;

    if (!this.alreadyInit) { // called once
      // this will only work in screen mode
      this.route.paramMap.subscribe((params: ParamMap) => {
        if (params.has('view')) {
          this.searchView = SearchView[params.get('view')];
        }
      });
    }

    // Reset the state of the master component state
    this.localState = new MasterDetailsStore();
    this._formatChoices = null;
    this.crud = this.api.crudFactory(this.apiEndpoint, this.notifyDestruct$);
    this.checked = {};
    this.exportFormat = 'xlsx';
    this.exportSkip = 0;
    this.showExportSpinner = false;
    this.exportErrorMessage = null;
    this.actionErrorMessage = null;
    this.actionValidationErrors = {};
    this.originalTableColumnPaths = null;

    if (!this.state.displayMode) {
      this.state.displayMode = this.enableTreeView ? MasterDisplayMode.tree : MasterDisplayMode.flat;
    }

    // Unless the data is already loaded, start loading
    if (this.state.masterStatus !== MasterStatus.loaded) {
      this.fetch();
    }

    this.alreadyInit = true;
  }

  ngOnDestroy() {
    // This cancels any asynchronous backend calls
    this.notifyDestruct$.next();
    this.cancelAllTreeQueries();
  }

  private cancelAllTreeQueries(): void {
    if (!!this.state.treeNodes) {
      this.state.treeNodes.forEach(node => {

        // All table nodes that are loading or error, are reset to null so
        // they appear collapsed next time the screen is opened
        if (node.status !== MasterStatus.loaded) {
          node.status = null;
          node.isExpanded = false;
        }

        // cancel any pending queries
        if (!!node.notifyCancel$) {
          node.notifyCancel$.next();
        }
      });
    }
  }

  public fetch() {
    this.notifyFetch$.next();
  }

  private doFetch(): Observable<void> {

    // any currently running queries that are loading children of nodes need to be canceled
    this.cancelAllTreeQueries();

    // Remove previous Ids from the store
    let s = this.state;
    s.flatIds = [];
    s.treeNodes = [];
    s.detailsId = null; // clear the cached details item
    this.checked = {}; // clear all selection
    this.actionValidationErrors = {}; // clear validation errors
    s.masterStatus = MasterStatus.loading;

    // compute the parameters
    const isTree = this.isTreeMode;

    const top = (isTree && !this.searchOrFilter) ? 2500 : this.PAGE_SIZE;
    const skip = (isTree && !this.searchOrFilter) ? 0 : s.skip;
    const orderby = isTree ? 'Node' : (!!s.orderBy && s.orderBy !== 'Node' ? (s.orderBy + (s.desc ? ' desc' : '')) : null);
    const search = s.search;
    const expandOld = isTree ? (!!this.expand ? this.expand + ',Parent' : 'Parent') : this.expand; // TODO include Parents properly

    let expand = this.expand;
    if (isTree) {
      // in tree mode must always expand the Parents
      expand = !!expand ? expand + ',Parent' : 'Parent';

      // all other expanded properties should be applied to the parent too
      // e.g expand=Category, becomes expand=Category,Parent/Category
      const expandWithParents = expand.split(',')
      .map(atom => atom.trim())
      .filter(atom => !!atom && !atom.startsWith('Parent'))
      .map(atom => `Parent/${atom}`)
      .join(',');

      if (!!expandWithParents) {
        expand = expand + ',' + '' + expandWithParents;
      }
    }

    // compute the filter
    let filter = this.filter();
    if (isTree && !this.searchOrFilter) {
      filter = 'Node childof null';
    }

    if (!s.inactive) {
      const activeOnlyFilter = isTree ? `${this.inactiveFilter} or ActiveChildCount gt 0` : this.inactiveFilter;
      if (!!filter) {
        filter = `(${filter}) and (${activeOnlyFilter})`;
      } else {
        filter = activeOnlyFilter;
      }
    }

    // Retrieve the entities
    return this.crud.get({
      top: top,
      skip: skip,
      orderby: orderby,
      search: search,
      filter: filter,
      expand: expand
    }).pipe(
      tap((response: GetResponse<DtoForSaveKeyBase>) => {
        s = this.state; // get the source
        s.masterStatus = MasterStatus.loaded;
        s.top = response.Top;
        s.skip = response.Skip;
        s.desc = !!response.OrderBy && response.OrderBy.toLowerCase().endsWith(' desc');
        s.orderBy = s.desc ? response.OrderBy.substring(0, response.OrderBy.length - ' desc'.length) : response.OrderBy;
        s.total = response.TotalCount;
        s.bag = response.Bag;
        s.collectionName = response.CollectionName;

        // add to the relevant collection depending on mode
        if (this.isTreeMode) {
          const ids = addToWorkspace(response, this.workspace);
          const entityWs = this.workspace.current[response.CollectionName];
          s.updateTreeNodes(ids, entityWs, TreeRefreshMode.cleanSlate, this.searchOrFilter);
        } else {
          s.flatIds = addToWorkspace(response, this.workspace);
        }
      }),
      catchError((friendlyError) => {
        s = this.state; // get the source
        s.masterStatus = MasterStatus.error;
        s.errorMessage = friendlyError.error;
        return of(null);
      })
    );
  }

  private fetchNodeChildren(parentNode: NodeInfo): void {

    if (!parentNode.notifyCancel$) {
      parentNode.notifyCancel$ = new Subject<void>();
    } else {
      parentNode.notifyCancel$.next(); // cancel previous call
    }

    const parentId = parentNode.id;

    // capture the state object and clear the details object
    let s = this.state;
    s.detailsId = null;

    // show rotator next to the expanded item
    parentNode.status = MasterStatus.loading;

    let filter = `Node childof '${parentId}'`;
    if (!s.inactive) {
      const activeOnlyFilter = `${this.inactiveFilter} or ActiveChildCount gt 0`;
      filter = `(${filter}) and (${activeOnlyFilter})`;
    }

    // Retrieve the entities
    const crud = this.api.crudFactory(this.apiEndpoint, parentNode.notifyCancel$);
    crud.get({
      top: 2500,
      orderby: 'Node',
      filter: filter,
      expand: this.expand
    }).pipe(
      tap((response: GetResponse<DtoForSaveKeyBase>) => {
        s = this.state; // get the source
        s.collectionName = response.CollectionName;

        // Hide the rotator in the parent
        parentNode.status = MasterStatus.loaded;
        const ids = addToWorkspace(response, this.workspace);
        const entityWs = this.workspace.current[response.CollectionName];
        s.updateTreeNodes(ids, entityWs, TreeRefreshMode.preserveExpansions);
        s.total = s.total + ids.length;
      }),
      catchError((friendlyError) => {
        s = this.state; // get the source
        parentNode.status = MasterStatus.error;
        this.displayErrorModal(friendlyError.error);
        return of(null);
      })
    ).subscribe();
  }


  public get state(): MasterDetailsStore {
    // Important to always reference the source, and not take a local reference
    // on some occasions the source can be reset and using a local reference can cause bugs
    if (this.mode === 'popup') {

      // popups use a local store that vanishes when the popup is destroyed
      if (!this.localState) {
        this.localState = new MasterDetailsStore();
      }

      return this.localState;
    } else { // this.mode === 'screen'

      // screens on the other hand use a global store
      if (!this.workspace.current.mdState[this.apiEndpoint]) {
        this.workspace.current.mdState = {}; // This forces any other master/details screen to refresh
        this.workspace.current.mdState[this.apiEndpoint] = new MasterDetailsStore();
      }

      return this.workspace.current.mdState[this.apiEndpoint];
    }
  }

  private urlStateChange(): void {
    // We wish to store part of the page state in the URL
    // This method is called whenever that part of the state has changed
    // Below we capture the new URL state, and then navigate to the new URL
    const params: Params = {
      view: this.searchView
    };

    this.router.navigate(['.', params], { relativeTo: this.route });
  }

  ////////////// UI Bindings below

  get errorMessage() {
    return this.state.errorMessage;
  }

  get flatIds() {
    return this.state.flatIds;
  }

  get orderBy() {
    return this.state.orderBy;
  }

  onOrderBy(orderBy: string) {
    const s = this.state;
    if (!!orderBy) {
      if (s.orderBy !== orderBy) {
        s.orderBy = orderBy;
        s.desc = false;
      } else {
        if (!s.desc) {
          s.desc = true;
        } else {
          s.orderBy = null;
        }
      }
      this.exportSkip = 0;
      s.skip = 0;
      this.fetch();
    }
  }

  get desc() {
    return this.state.desc;
  }

  get from(): number {
    const s = this.state;
    return Math.min(s.skip + 1, this.total);
  }

  get to(): number {
    const s = this.state;
    if (s.masterStatus === MasterStatus.loaded) {
      // If the data is loaded, just count the data
      return Math.max(s.skip + s.masterIds.length, 0);
    } else {
      // Otherwise dispaly the selected count while the data is loading
      return Math.min(s.skip + s.top, this.total);
    }
  }

  get total(): number {
    return this.state.total;
  }

  get bag(): any {
    return this.state.bag;
  }

  onFirstPage() {
    this.state.skip = 0;
    this.fetch();
  }

  get canFirstPage(): boolean {
    return this.canPreviousPage;
  }

  onPreviousPage() {
    const s = this.state;
    s.skip = Math.max(s.skip - this.PAGE_SIZE, 0);
    this.fetch();
  }

  get canPreviousPage(): boolean {
    return this.state.skip > 0;
  }

  onNextPage() {
    const s = this.state;
    s.skip = s.skip + this.PAGE_SIZE;
    this.fetch();
  }

  get canNextPage(): boolean {
    return this.to < this.total;
  }

  get enableTree(): boolean {
    return this.enableTreeView;
  }

  get searchOrFilter(): boolean {
    return !!this.search || !!this.isAnyFilterCheckedOtherThanInactive;
  }

  get showPagingControls(): boolean {
    return this.isFlatMode || this.searchOrFilter;
  }

  get isTreeMode(): boolean {
    return this.state.isTreeMode;
  }

  get isFlatMode(): boolean {
    return !this.isTreeMode; // this.state.displayMode === MasterDisplayMode.flat;
  }

  get showTilesView(): boolean {
    return this.searchView === SearchView.tiles;
  }

  get showTableView(): boolean {
    return this.searchView === SearchView.table;
  }

  get showErrorMessage(): boolean {
    return this.state.masterStatus === MasterStatus.error;
  }

  get showSpinner(): boolean {
    return this.state.masterStatus === MasterStatus.loading;
  }

  get showNoItemsFound(): boolean {
    return this.state.masterStatus === MasterStatus.loaded &&
      (!this.state.masterIds || this.state.masterIds.length === 0);
  }

  get showImport(): boolean {
    return !this.isPopupMode && this.showImportButton;
  }

  get showExport(): boolean {
    return !this.isPopupMode && this.showExportButton;
  }

  get showDataDropdown(): boolean {
    return this.showImport || this.showExport;
  }

  get isScreenMode(): boolean {
    return this.mode === 'screen';
  }

  get isPopupMode(): boolean {
    return this.mode === 'popup';
  }

  onTreeMode() {
    if (this.state.displayMode !== MasterDisplayMode.tree) {
      this.state.displayMode = MasterDisplayMode.tree;
      this.state.orderBy = null;
      this.fetch();
    }
  }

  onFlatMode() {
    if (this.state.displayMode !== MasterDisplayMode.flat) {
      this.state.displayMode = MasterDisplayMode.flat;
      this.fetch();
    }
  }

  onTilesView() {
    this.searchView = SearchView.tiles;
    if (this.isScreenMode) {
      this.urlStateChange();
    }
  }

  onTableView() {
    this.searchView = SearchView.table;
    if (this.isScreenMode) {
      this.urlStateChange();
    }
  }

  onCreate() {
    if (!this.canCreate) {
      return;
    }

    if (this.isPopupMode) {
      this.create.emit();
    } else {
      this.router.navigate(['.', 'new'], { relativeTo: this.route });
    }
  }

  onRefresh() {
    // The if statement to deal with incessant button clickers (Users who hit refresh repeatedly)
    if (this.state.masterStatus !== MasterStatus.loading) {
      this.fetch();
    }
  }

  onImport() {
    if (!this.canImport) {
      return;
    }
    this.router.navigate(['.', 'import'], { relativeTo: this.route });
  }

  onSelect(id: number | string) {
    if (this.isPopupMode) {
      this.select.emit(id);
    } else {
      this.router.navigate(['.', id], { relativeTo: this.route });
    }
  }

  get showCreate() {
    return this.showCreateButton;
  }

  get canCreatePermissions(): boolean {
    return this.workspace.current.canCreate(this.viewId);
  }

  get canCreate(): boolean {
    return this.canCreatePermissions;
  }

  get createTooltip(): string {
    return this.canCreatePermissions ? '' : this.translate.instant('Error_AccountDoesNotHaveSufficientPermissions');
  }

  get canImportPermissions(): boolean {
    return this.workspace.current.canCreate(this.viewId);
  }

  get canImport(): boolean {
    return this.canImportPermissions;
  }

  get importTooltip(): string {
    return this.canImportPermissions ? '' : this.translate.instant('Error_AccountDoesNotHaveSufficientPermissions');
  }

  get canExportPermissions(): boolean {
    return this.workspace.current.canRead(this.viewId);
  }

  get canExport(): boolean {
    return this.canExportPermissions;
  }

  get exportTooltip(): string {
    return this.canExportPermissions ? '' : this.translate.instant('Error_AccountDoesNotHaveSufficientPermissions');
  }

  get showDelete() {
    return this.showDeleteButton;
  }

  get showDeleteWithDescendants() {
    return this.showDelete && this.isTreeMode;
  }

  get canDeletePermissions(): boolean {
    return this.workspace.current.canUpdate(this.viewId, null);
  }

  get canDelete(): boolean {
    return this.canDeletePermissions;
  }

  get deleteTooltip(): string {
    return this.canDeletePermissions ? '' : this.translate.instant('Error_AccountDoesNotHaveSufficientPermissions');
  }

  trackById(_: any, id: number | string) {
    return id;
  }

  trackByNodeId(_: any, node: NodeInfo) {
    return node.id;
  }

  colWidth(colPath: string) {
    // This returns an html percentage width based on the weights assigned to this column and all the other columns

    // Get the weight of this column
    const weight = colPath === '(Description)' ? 2 : this.tableColumnTemplates[colPath].weight || 1;

    // Get the total weight of the other columns
    let totalWeight = 2; // to account for the description column
    for (let i = 0; i < this.tableColumnPaths.length; i++) {
      const path = this.tableColumnPaths[i];
      if (this.tableColumnTemplates[path]) {
        totalWeight = totalWeight + (this.tableColumnTemplates[path].weight || 1);
      }
    }

    // Calculate the percentage, (
    // if totalweight = 0 this method will never be called in the first place)
    return ((weight / totalWeight) * 100) + '%';
  }

  get formatChoices(): { name: string, value: any }[] {

    if (!this._formatChoices) {
      this._formatChoices = Object.keys(TemplateArguments_Format)
        .map(key => ({ name: TemplateArguments_Format[key], value: key }));
    }

    return this._formatChoices;
  }

  get search(): string {
    return this.state.search;
  }

  set search(val: string) {
    if (!val) {
      val = null;
    }

    const s = this.state;
    if (s.search !== val) {
      s.search = val;
    }
    this.searchChanged$.next(val);
  }

  public get flip() {
    // this is to flip the UI icons in RTL
    return this.workspace.ws.isRtl ? 'horizontal' : null;
  }

  public get actionsDropdownPlacement() {
    return this.workspace.ws.isRtl ? 'bottom-right' : 'bottom-left';
  }

  public get errorPopoverPlacement() {
    return this.workspace.ws.isRtl ? 'left' : 'right';
  }

  public get filterDropdownPlacement(): string {
    return this.workspace.ws.isRtl ? 'bottom-left' : 'bottom-right';
  }

  public get tableColumnPathsAndExtras() {
    if (this.originalTableColumnPaths !== this.tableColumnPaths) {
      this.originalTableColumnPaths = this.tableColumnPaths;

      // This method conditionally adds the multi-select column
      let result: string[] = [];

      if (!!this.tableColumnPaths) {
        result = this.tableColumnPaths.slice();
      }

      if (this.allowMultiselect && this.isScreenMode) {
        result.unshift('errors');
        result.unshift('multiselect');
      }

      this._tableColumnPathsAndExtras = result;
    }

    return this._tableColumnPathsAndExtras;
  }

  // Export-related stuff
  get showExportPaging(): boolean {
    return this.maxTotalExport < this.total;
  }

  get fromExport(): number {
    return Math.min(this.exportSkip + 1, this.totalExport);
  }

  get toExport(): number {
    return Math.min(this.exportSkip + this.maxTotalExport, this.totalExport);
  }

  get totalExport(): number {
    return this.total;
  }

  get canPreviousPageExport() {
    return this.exportSkip > 0;
  }

  get canNextPageExport() {
    return this.toExport < this.totalExport;
  }

  public onPerviousPageExport() {
    this.exportSkip = Math.max(this.exportSkip - this.exportPageSize, 0);
  }

  public onNextPageExport() {
    this.exportSkip = this.exportSkip + this.exportPageSize;
  }

  get maxTotalExport(): number {
    return this.exportPageSize;
  }

  onExport() {
    if (!this.canExport) {
      return;
    }

    const from = this.fromExport;
    const to = this.toExport;
    const format = this.exportFormat;
    this.exportErrorMessage = null;
    this.showExportSpinner = true;

    const s = this.state;

    this.crud.export({
      top: this.exportPageSize,
      skip: this.exportSkip,
      orderby: s.orderBy,
      desc: s.desc,
      search: s.search,
      filter: this.filter(),
      expand: null,
      inactive: s.inactive,
      format: format
    }).subscribe(
      (blob: Blob) => {
        this.showExportSpinner = false;
        const fileName = `${this.exportFileName || this.translate.instant('Export')} ${from}-${to} ${new Date().toDateString()}.${format}`;
        downloadBlob(blob, fileName);
      },
      (friendlyError: any) => {
        this.showExportSpinner = false;
        this.exportErrorMessage = friendlyError.error;
      },
      () => {
        this.showExportSpinner = false;
      }
    );
  }

  public get showExportErrorMessage(): boolean {
    return !!this.exportErrorMessage;
  }

  // Multiselect-related stuff
  public get canCheckAll(): boolean {
    return this.displayedIds.length > 0;
  }

  public get areAllChecked(): boolean {
    return this.displayedIds.length > 0 && this.displayedIds.every(id => !!this.checked[id]);
  }

  public get areAnyChecked(): boolean {
    return this.displayedIds.some(id => !!this.checked[id]);
  }

  public get checkedCount(): number {
    return this.checkedIds.length;

  }

  public get checkedIds(): (number | string)[] {
    return this.displayedIds.filter(id => !!this.checked[id]);
  }

  onCheckAll() {
    if (this.areAllChecked) {
      // Uncheck all
      this.checked = {};

    } else {
      // Check all
      this.displayedIds.forEach(id => this.checked[id] = true);
    }
  }

  get displayedIds(): (string | number)[] {
    if (this.isTreeMode) {
      return this.treeNodes.filter(node => this.showTreeNode(node)).map(node => node.id);
    } else {
      return this.flatIds;
    }
  }

  onCancelMultiselect() {
    this.checked = {};
    this.actionValidationErrors = {};
  }

  canAction(requiresUpdatePermission: boolean) {
    return !requiresUpdatePermission || this.workspace.current.canUpdate(this.viewId, null);
  }

  actionTooltip(requiresUpdatePermission: boolean) {
    return this.canAction(requiresUpdatePermission) ? '' : this.translate.instant('Error_AccountDoesNotHaveSufficientPermissions');
  }

  onAction(action: (p: (string | number)[]) => Observable<void>) {
    // clear any previous errors
    this.actionErrorMessage = null;
    this.actionValidationErrors = {};

    const ids = this.checkedIds;
    action(ids).subscribe(
      () => this.checked = {},
      (friendlyError: any) => {
        this.handleActionError(ids, friendlyError);
      }
    );
  }

  onDelete() {
    // clear any previous errors
    this.actionErrorMessage = null;
    this.actionValidationErrors = {};

    const ids = this.checkedIds;
    this.crud.delete(ids).subscribe(
      () => {
        // Update the UI to reflect deletion of items
        this.state.delete(ids, this.workspace.current[this.state.collectionName]);
        this.checked = {};
        if (this.displayedIds.length === 0 && this.total > 0) {
          // auto refresh if the user deleted the entire page
          this.fetch();
        }
      },
      (friendlyError: any) => {
        this.handleActionError(ids, friendlyError);
      }
    );
  }

  onDeleteWithDescendants() {
    // clear any previous errors
    this.actionErrorMessage = null;
    this.actionValidationErrors = {};

    const ids = this.checkedIds;
    this.crud.deleteWithDescendants(ids).subscribe(
      () => {
        // Update the UI to reflect deletion of items
        this.state.delete(ids, this.workspace.current[this.state.collectionName]);
        this.checked = {};
        if (this.displayedIds.length === 0 && this.total > 0) {
          // auto refresh if the user deleted the entire page
          this.fetch();
        }
      },
      (friendlyError: any) => {
        this.handleActionError(ids, friendlyError);
      }
    );
  }

  private handleActionError(ids: (string | number)[], friendlyError) {
    // This handles any errors caused by actions

    if (friendlyError.status === 422) {
      const keys = Object.keys(friendlyError.error);
      keys.forEach(key => {
        // Validation error keys are expected to look like this '[33].XYZ'
        // The code below extracts the index and maps it back to the correct id
        const pieces = key.split(']'); // ['[33', '.XYZ']
        if (pieces.length > 1) {
          let firstPiece = pieces[0]; // '[33'
          if (firstPiece.startsWith('[')) {
            firstPiece = firstPiece.substring(1, firstPiece.length); // '33'
            const index = +firstPiece; // 33
            if (index < ids.length) {
              // Get the Id that corresponds to this index
              const id = ids[index];
              if (!this.actionValidationErrors[id]) {
                this.actionValidationErrors[id] = [];
              }

              friendlyError.error[key].forEach(errorMessage => {
                // action errors map ids to list of errors messages
                this.actionValidationErrors[id].push(errorMessage);
              });
            } else {
              // Developer mistake
              console.error('The key index returned was outside the range of the collection sent: ' + key);
            }
          } else {
            // Developer mistake
            console.error('One of the keys in the 422 response did not contain an opening square bracket [: ' + key);
          }
        } else {
          // Developer mistake
          console.error('One of the keys in the 422 response did not contain a closing square bracket ]: ' + key);
        }
      });

      this.displayErrorModal(this.translate.instant('ActionDidNotPassValidation'));
    } else {
      this.displayErrorModal(friendlyError.error);
    }
  }

  private displayErrorModal(errorMessage: string): void {
    this.actionErrorMessage = errorMessage;
    this.modalService.open(this.errorModal);
  }

  public showErrorHighlight(id: string | number): boolean {
    return this.actionValidationErrors[id] && this.actionValidationErrors[id].length > 0;
  }

  // Filter-related stuff

  private filter(): string {
    const filterState = this.state.filterState;
    const disjunctions: string[] = [];
    const groupNames = Object.keys(this.filterDefinition);
    for (let i = 0; i < groupNames.length; i++) {
      const groupName = groupNames[i];
      const expressions: string[] = [];
      const groupState = filterState[groupName];
      if (!!groupState) {
        for (const expression in groupState) {
          if (groupState[expression]) {
            expressions.push(expression);
          }
        }
      }
      const disjunction = expressions.join(' or ');
      if (!!disjunction) {
        disjunctions.push(disjunction);
      }
    }

    let conjunction = disjunctions.join(') and (');
    if (!!conjunction) {
      conjunction = '(' + conjunction + ')';
    }
    return conjunction;
  }

  onIncludeInactive(): void {
    const s = this.state;
    s.inactive = !s.inactive;
    this.fetch();
  }

  get isIncludeInactive(): boolean {
    return this.state.inactive;
  }

  onFilterCheck(groupName: string, expression: string) {
    const filterGroups = this.state.filterState;
    if (!filterGroups[groupName]) {
      filterGroups[groupName] = {};
    }

    const group = filterGroups[groupName];
    group[expression] = !group[expression];

    this.fetch();
  }

  isFilterChecked(groupName: string, expression: string): boolean {
    const s = this.state.filterState;
    return !!s[groupName] && !!s[groupName][expression];
  }

  get isAnyFilterChecked(): boolean {
    // when this is true the UI shows the red circle
    // This code checks whether any expression in any group is checked, also if include inactive is checked
    return this.state.inactive || this.isAnyFilterCheckedOtherThanInactive;
  }

  get isAnyFilterCheckedOtherThanInactive(): boolean {
    // when this is true, the way data is queried in tree view changes from paged to not paged
    return Object.keys(this.filterDefinition).some(groupName => {
      const group = this.filterDefinition[groupName];
      return group.some(e => this.isFilterChecked(groupName, e.expression));
    });
  }

  onClearFilter() {
    if (this.isAnyFilterChecked) {
      const s = this.state;
      s.inactive = false;
      s.filterState = {};
      this.fetch();
    }
  }

  get groupNames(): string[] {
    return Object.keys(this.filterDefinition);
  }

  filterTemplates(groupName: string): {
    template: TemplateRef<any>,
    expression: string
  }[] {
    return this.filterDefinition[groupName];
  }

  isRecentlyViewed(id: number | string) {
    return this.state.detailsId === id;
  }

  onCancel() {
    this.cancel.emit();
  }

}
