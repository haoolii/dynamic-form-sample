// ============ 型別定義 ============
import { Component, signal, Input, Output, EventEmitter, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Injectable } from '@angular/core';

/** 操作符類型 */
export type Operator = 'EQ' | '!EQ' | 'CTN' | 'GT' | 'LT';

/** 條件規則 */
export interface ConditionRule {
  field: string;
  operator: Operator;
  value: string;
  enabled: boolean | string;
}

/** OR 群組 */
export interface OrGroup {
  enabled: boolean;
  operator: 'OR';
  children: ConditionRule[];
}

/** 根規則 (AND 層級) */
export interface RootRule {
  enabled: boolean;
  operator: 'AND';
  children: OrGroup[];
}

/** 完整配置 */
export interface UserConfig {
  [key: string]: RootRule | undefined;
}

/** 條件規則 Form */
export interface ConditionRuleForm {
  field: FormControl<string>;
  operator: FormControl<Operator>;
  value: FormControl<string>;
  enabled: FormControl<boolean>;
}

/** OR 群組 Form */
export interface OrGroupForm {
  enabled: FormControl<boolean>;
  operator: FormControl<'OR'>;
  children: FormArray<FormGroup<ConditionRuleForm>>;
}

/** 根規則 Form */
export interface RootRuleForm {
  enabled: FormControl<boolean>;
  operator: FormControl<'AND'>;
  children: FormArray<FormGroup<OrGroupForm>>;
}

// ============ Service ============
@Injectable({ providedIn: 'root' })
export class RuleService {
  private originalData = signal<UserConfig>({});

  initializeSampleData(): UserConfig {
    const sampleData: UserConfig = {
      TYPE_A_RULE: {
        enabled: true,
        operator: 'AND',
        children: [
          {
            enabled: true,
            operator: 'OR',
            children: [
              { field: 'assigen', operator: 'EQ', value: 'xxx', enabled: true },
              { field: 'comment', operator: 'CTN', value: 'xxx', enabled: true },
              { field: 'user', operator: '!EQ', value: 'ddd', enabled: true }
            ]
          },
          {
            enabled: true,
            operator: 'OR',
            children: [
              { field: 'assigen', operator: 'EQ', value: 'yyy', enabled: true },
              { field: 'comment', operator: 'CTN', value: 'yyy', enabled: true }
            ]
          }
        ]
      },
      TYPE_B_RULE: {
        enabled: true,
        operator: 'AND',
        children: [
          {
            enabled: true,
            operator: 'OR',
            children: [
              { field: 'status', operator: 'EQ', value: 'active', enabled: true }
            ]
          }
        ]
      }
    };

    this.originalData.set(JSON.parse(JSON.stringify(sampleData)));
    return sampleData;
  }

  getOriginalData(): UserConfig {
    return this.originalData();
  }

  setOriginalData(data: UserConfig): void {
    this.originalData.set(JSON.parse(JSON.stringify(data)));
  }

  buildMainForm(data: UserConfig, typeList: string[]): FormGroup<Record<string, FormGroup<RootRuleForm>>> {
    const controls: Record<string, FormGroup<RootRuleForm>> = {};
    typeList.forEach(type => {
      if (data[type]) {
        controls[type] = this.createRootRuleForm(data[type]);
      }
    });
    return new FormGroup(controls);
  }

  createRootRuleForm(data?: RootRule): FormGroup<RootRuleForm> {
    return new FormGroup<RootRuleForm>({
      enabled: new FormControl(data?.enabled ?? true, { nonNullable: true }),
      operator: new FormControl<'AND'>('AND', { nonNullable: true }),
      children: new FormArray(
        data?.children.map(group => this.createOrGroupForm(group)) || []
      )
    });
  }

  createOrGroupForm(data?: OrGroup): FormGroup<OrGroupForm> {
    return new FormGroup<OrGroupForm>({
      enabled: new FormControl(data?.enabled ?? true, { nonNullable: true }),
      operator: new FormControl<'OR'>('OR', { nonNullable: true }),
      children: new FormArray(
        data?.children.map(rule => this.createConditionForm(rule)) || []
      )
    });
  }

  createConditionForm(data?: ConditionRule): FormGroup<ConditionRuleForm> {
    return new FormGroup<ConditionRuleForm>({
      field: new FormControl(data?.field || '', { nonNullable: true, validators: [Validators.required] }),
      operator: new FormControl(data?.operator || 'EQ', { nonNullable: true, validators: [Validators.required] }),
      value: new FormControl(data?.value || '', { nonNullable: true, validators: [Validators.required] }),
      enabled: new FormControl(typeof data?.enabled === 'string' ? data.enabled === 'true' : data?.enabled ?? true, { nonNullable: true })
    });
  }
}

// ============ Condition Rule Component ============
@Component({
  selector: 'app-condition-rule',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rule-item">
      <label class="checkbox">
        <input type="checkbox" [formControl]="ruleForm.controls.enabled">
      </label>

      <select [formControl]="ruleForm.controls.field" class="field-select">
        <option value="">選擇欄位</option>
        <option value="assigen">Assigen</option>
        <option value="comment">Comment</option>
        <option value="user">User</option>
        <option value="status">Status</option>
        <option value="priority">Priority</option>
      </select>

      <select [formControl]="ruleForm.controls.operator" class="operator-select">
        <option value="EQ">等於 (=)</option>
        <option value="!EQ">不等於 (≠)</option>
        <option value="CTN">包含</option>
        <option value="GT">大於 (>)</option>
        <option value="LT">小於 (<)</option>
      </select>

      <input
        type="text"
        [formControl]="ruleForm.controls.value"
        placeholder="輸入值"
        class="value-input"
        [disabled]="readonly">

      <button
        type="button"
        class="btn-danger btn-icon"
        (click)="remove.emit()"
        [disabled]="readonly">
        ✕
      </button>
    </div>
  `,
  styles: [`
    .rule-item {
      display: grid;
      grid-template-columns: 40px 1fr 1fr 2fr 40px;
      gap: 12px;
      align-items: center;
      padding: 12px;
      background: #f6f8fa;
      border-radius: 6px;
    }

    .checkbox {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
    }

    select, input[type="text"] {
      padding: 8px 12px;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      font-size: 14px;
    }

    select:focus, input:focus {
      outline: none;
      border-color: #0969da;
    }

    .btn-danger {
      background: #cf222e;
      color: white;
      width: 32px;
      height: 32px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-danger:hover:not(:disabled) {
      background: #a40e26;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class ConditionRuleComponent {
  @Input() ruleForm!: FormGroup<ConditionRuleForm>;
  @Input() readonly = false;
  @Output() remove = new EventEmitter<void>();

  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    // 監聽欄位變化,可以做一些 UI 邏輯
    this.ruleForm.controls.field.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(field => {
        console.log('Field changed:', field);
        // 可以根據欄位調整操作符選項等
      });
  }
}

// ============ OR Group Component ============
@Component({
  selector: 'app-or-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConditionRuleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="or-group-wrapper">
      <div class="group-header">
        <div class="group-controls">
          <label>
            <input type="checkbox" [formControl]="orGroupForm.controls.enabled">
            啟用群組 #{{ groupIndex + 1 }}
          </label>
          <span class="operator-badge or">OR</span>
        </div>
        <button
          type="button"
          class="btn-danger btn-sm"
          (click)="removeGroup.emit()"
          [disabled]="readonly">
          刪除群組
        </button>
      </div>

      <div class="rules-list">
        @for (rule of getConditions(); track rule; let j = $index) {
          <app-condition-rule
            [ruleForm]="rule"
            [readonly]="readonly"
            (remove)="removeCondition.emit(j)">
          </app-condition-rule>
        }

        <button
          type="button"
          class="btn-secondary btn-sm"
          (click)="addCondition.emit()"
          [disabled]="readonly">
          + 新增條件
        </button>
      </div>
    </div>
  `,
  styles: [`
    .or-group-wrapper {
      border: 2px solid #d0d7de;
      border-radius: 8px;
      padding: 16px;
      background: white;
    }

    .group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e1e4e8;
    }

    .group-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .operator-badge {
      background: #8250df;
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .rules-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-danger, .btn-secondary {
      padding: 6px 12px;
      font-size: 13px;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-danger {
      background: #cf222e;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #a40e26;
    }

    .btn-secondary {
      background: #6e7781;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #57606a;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class OrGroupComponent {
  @Input() orGroupForm!: FormGroup<OrGroupForm>;
  @Input() groupIndex!: number;
  @Input() readonly = false;
  @Output() removeGroup = new EventEmitter<void>();
  @Output() addCondition = new EventEmitter<void>();
  @Output() removeCondition = new EventEmitter<number>();

  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    // 監聽群組啟用狀態
    this.orGroupForm.controls.enabled.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        distinctUntilChanged()
      )
      .subscribe(enabled => {
        console.log(`OR Group ${this.groupIndex} enabled:`, enabled);
      });
  }

  getConditions(): FormGroup<ConditionRuleForm>[] {
    return this.orGroupForm.controls.children.controls as FormGroup<ConditionRuleForm>[];
  }
}

// ============ Rule Type Form Component ============
@Component({
  selector: 'app-rule-type-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OrGroupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form-header">
      <h2>
        {{ typeName }}
        @if (isDirty) {
          <span class="dirty-badge">已修改</span>
        }
      </h2>
      @if (!hasRules) {
        <button class="btn-primary" (click)="createNewRule.emit()" [disabled]="readonly">
          + 新增第一筆規則
        </button>
      }
    </div>

    @if (typeForm) {
      <div class="rule-form">
        <!-- Root Level Controls -->
        <div class="root-controls">
          <label>
            <input type="checkbox" [formControl]="typeForm.controls.enabled">
            啟用規則
          </label>
          <span class="operator-badge">{{ typeForm.controls.operator.value }}</span>
        </div>

        <!-- AND Groups (FormArray) -->
        <div class="and-groups">
          @for (orGroup of getOrGroups(); track orGroup; let i = $index) {
            <app-or-group
              [orGroupForm]="orGroup"
              [groupIndex]="i"
              [readonly]="readonly"
              (removeGroup)="removeOrGroup.emit(i)"
              (addCondition)="addCondition.emit(i)"
              (removeCondition)="removeCondition.emit({groupIndex: i, conditionIndex: $event})">
            </app-or-group>
          }
        </div>

        <!-- Add OR Group Button -->
        <button
          type="button"
          class="btn-primary"
          (click)="addOrGroup.emit()"
          [disabled]="readonly">
          + 新增 OR 群組
        </button>

        <!-- Actions -->
        <div class="form-actions">
          <button
            type="button"
            class="btn-danger"
            (click)="deleteRule.emit()"
            [disabled]="readonly">
            刪除此規則
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .form-header h2 {
      margin: 0;
      font-size: 24px;
      color: #24292e;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .dirty-badge {
      background: #1f6feb;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .root-controls {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #f6f8fa;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .operator-badge {
      background: #0969da;
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .and-groups {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 20px;
    }

    .btn-primary, .btn-danger {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #0969da;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0860ca;
    }

    .btn-danger {
      background: #cf222e;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #a40e26;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e1e4e8;
    }

    label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
    }
  `]
})
export class RuleTypeFormComponent {
  @Input() typeForm!: FormGroup<RootRuleForm> | null;
  @Input() typeName!: string;
  @Input() isDirty = false;
  @Input() readonly = false;
  @Output() createNewRule = new EventEmitter<void>();
  @Output() addOrGroup = new EventEmitter<void>();
  @Output() removeOrGroup = new EventEmitter<number>();
  @Output() addCondition = new EventEmitter<number>();
  @Output() removeCondition = new EventEmitter<{groupIndex: number, conditionIndex: number}>();
  @Output() deleteRule = new EventEmitter<void>();

  private destroyRef = inject(DestroyRef);

  get hasRules(): boolean {
    return !!this.typeForm;
  }

  ngOnInit() {
    if (this.typeForm) {
      // 監聽根規則啟用狀態
      this.typeForm.controls.enabled.valueChanges
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          distinctUntilChanged()
        )
        .subscribe(enabled => {
          console.log(`${this.typeName} root enabled:`, enabled);
        });
    }
  }

  getOrGroups(): FormGroup<OrGroupForm>[] {
    if (!this.typeForm) return [];
    return this.typeForm.controls.children.controls as FormGroup<OrGroupForm>[];
  }
}

// ============ Type List Sidebar Component ============
@Component({
  selector: 'app-type-list-sidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sidebar">
      <h3>Rule Types</h3>
      <ul class="type-list">
        @for (type of typeList; track type) {
          <li
            [class.active]="selectedType === type"
            (click)="selectType.emit(type)">
            <span class="type-name">
              @if (dirtyTypes.includes(type)) {
                <span class="dirty-indicator"></span>
              }
              {{ type }}
              @if (errorTypes.includes(type)) {
                <span class="error-indicator"></span>
              }
            </span>
            @if (getRuleCount(type) > 0) {
              <span class="badge">{{ getRuleCount(type) }}</span>
            }
          </li>
        }
      </ul>

      <div class="sidebar-actions">
        <button
          class="btn-success btn-block"
          [disabled]="!hasChanges"
          (click)="saveAll.emit()">
          💾 儲存全部
        </button>
        <button
          class="btn-secondary btn-block"
          [disabled]="!hasChanges"
          (click)="resetAll.emit()">
          ↺ 重置全部
        </button>
        <button
          class="btn-primary btn-block"
          (click)="toggleReadonly.emit()">
          {{ readonly ? '解除唯讀' : '設定唯讀' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sidebar {
      width: 250px;
      background: #f5f7fa;
      border-right: 1px solid #e1e4e8;
      padding: 20px;
      display: flex;
      flex-direction: column;
    }

    .sidebar h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #24292e;
    }

    .type-list {
      list-style: none;
      padding: 0;
      margin: 0;
      flex: 1;
      overflow-y: auto;
    }

    .type-list li {
      padding: 10px 12px;
      margin-bottom: 4px;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .type-list li:hover {
      background: #e1e4e8;
    }

    .type-list li.active {
      background: #0969da;
      color: white;
    }

    .type-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .dirty-indicator {
      width: 8px;
      height: 8px;
      background: #1f6feb;
      border-radius: 50%;
      display: inline-block;
      animation: pulse 2s infinite;
    }

    .type-list li.active .dirty-indicator {
      background: #ffffff;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .error-indicator {
      width: 8px;
      height: 8px;
      background: red;
      border-radius: 50%;
      display: inline-block;
      margin-left: 6px;
      animation: pulse 1.5s infinite;
    }

    .badge {
      background: rgba(0,0,0,0.2);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
    }

    .sidebar-actions {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e1e4e8;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .btn-success, .btn-secondary, .btn-primary {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
    }

    .btn-success {
      background: #1a7f37;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #116329;
    }

    .btn-secondary {
      background: #6e7781;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #57606a;
    }

    .btn-primary {
      background: #0969da;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0860ca;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class TypeListSidebarComponent {
  @Input() typeList: string[] = [];
  @Input() selectedType: string | null = null;
  @Input() dirtyTypes: string[] = [];
  @Input() errorTypes: string[] = [];
  @Input() ruleCounts: Record<string, number> = {};
  @Input() hasChanges = false;
  @Input() readonly = false;
  @Output() selectType = new EventEmitter<string>();
  @Output() saveAll = new EventEmitter<void>();
  @Output() resetAll = new EventEmitter<void>();
  @Output() toggleReadonly = new EventEmitter<void>();

  getRuleCount(type: string): number {
    return this.ruleCounts[type] || 0;
  }
}

// ============ Main App Component ============
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TypeListSidebarComponent, RuleTypeFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rule-manager">
      <app-type-list-sidebar
        [typeList]="typeList()"
        [selectedType]="selectedType()"
        [dirtyTypes]="getDirtyTypes()"
        [errorTypes]="getErrorTypes()"
        [ruleCounts]="getRuleCounts()"
        [hasChanges]="isFormDirty()"
        [readonly]="readonly()"
        (selectType)="selectType($event)"
        (saveAll)="saveAllRules()"
        (resetAll)="resetAllRules()"
        (toggleReadonly)="toggleReadonly()">
      </app-type-list-sidebar>

      <div class="content">
        @if (selectedType(); as type) {
          <app-rule-type-form
            [typeForm]="mainForm.controls[type] || null"
            [typeName]="type"
            [isDirty]="isTypeDirty(type)"
            [readonly]="readonly()"
            (createNewRule)="createNewRule(type)"
            (addOrGroup)="addOrGroup(type)"
            (removeOrGroup)="removeOrGroup(type, $event)"
            (addCondition)="addCondition(type, $event)"
            (removeCondition)="removeCondition(type, $event.groupIndex, $event.conditionIndex)"
            (deleteRule)="deleteRule(type)">
          </app-rule-type-form>
        } @else {
          <div class="empty-state">
            <p>請從左側選擇一個規則類型</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .rule-manager {
      display: flex;
      height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .content {
      flex: 1;
      padding: 30px;
      overflow-y: auto;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #6e7781;
    }
  `]
})
export class AppComponent {
  private ruleService = inject(RuleService);

  typeList = signal<string[]>([
    'TYPE_A_RULE',
    'TYPE_B_RULE',
    'TYPE_C_RULE',
    'TYPE_D_RULE',
    'TYPE_E_RULE'
  ]);

  selectedType = signal<string | null>(null);
  readonly = signal(false);
  originalData = signal<UserConfig>({});

  mainForm!: FormGroup<Record<string, FormGroup<RootRuleForm>>>;

  constructor() {
    this.initializeForm();
  }

  initializeForm() {
    const sampleData = this.ruleService.initializeSampleData();
    this.originalData.set(this.ruleService.getOriginalData());
    this.mainForm = this.ruleService.buildMainForm(sampleData, this.typeList());
  }

  toggleReadonly() {
    this.readonly.update(v => !v);
    if (this.readonly()) {
      this.mainForm.disable({ emitEvent: false });
    } else {
      this.mainForm.enable({ emitEvent: false });
    }
  }

  selectType(type: string) {
    this.selectedType.set(type);
  }

  getDirtyTypes(): string[] {
    return this.typeList().filter(type => this.isTypeDirty(type));
  }

  getErrorTypes(): string[] {
    return this.typeList().filter(type => this.hasValidationError(type));
  }

  getRuleCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.typeList().forEach(type => {
      const form = this.mainForm.controls[type];
      counts[type] = form ? form.controls.children.length : 0;
    });
    return counts;
  }

  isTypeDirty(type: string): boolean {
    const currentForm = this.mainForm.controls[type];
    const originalRule = this.originalData()[type];
    if (!originalRule && currentForm) return true;
    if (originalRule && !currentForm) return true;
    if (!originalRule && !currentForm) return false;
    return JSON.stringify(originalRule) !== JSON.stringify(currentForm!.getRawValue());
  }

  isFormDirty(): boolean {
    return this.typeList().some(type => this.isTypeDirty(type));
  }

  hasValidationError(type: string): boolean {
    const form = this.mainForm.controls[type];
    if (!form) return false;
    const orGroups = form.controls.children.controls as FormGroup<OrGroupForm>[];
    for (const group of orGroups) {
      const rules = group.controls.children.controls as FormGroup<ConditionRuleForm>[];
      for (const rule of rules) {
        if (rule.invalid) return true;
      }
    }
    return false;
  }

  createNewRule(type: string) {
    const newRule: RootRule = {
      enabled: true,
      operator: 'AND',
      children: [{
        enabled: true,
        operator: 'OR',
        children: [{ field: '', operator: 'EQ', value: '', enabled: true }]
      }]
    };
    this.mainForm.addControl(type, this.ruleService.createRootRuleForm(newRule));
  }

  addOrGroup(type: string) {
    const form = this.mainForm.controls[type];
    if (!form) return;
    form.controls.children.push(
      this.ruleService.createOrGroupForm({
        enabled: true,
        operator: 'OR',
        children: [{ field: '', operator: 'EQ', value: '', enabled: true }]
      })
    );
  }

  removeOrGroup(type: string, index: number) {
    const form = this.mainForm.controls[type];
    if (!form) return;
    form.controls.children.removeAt(index);
  }

  addCondition(type: string, groupIndex: number) {
    const form = this.mainForm.controls[type];
    if (!form) return;
    const orGroup = form.controls.children.at(groupIndex) as FormGroup<OrGroupForm>;
    orGroup.controls.children.push(this.ruleService.createConditionForm());
  }

  removeCondition(type: string, groupIndex: number, conditionIndex: number) {
    const form = this.mainForm.controls[type];
    if (!form) return;
    const orGroup = form.controls.children.at(groupIndex) as FormGroup<OrGroupForm>;
    orGroup.controls.children.removeAt(conditionIndex);
  }

  deleteRule(type: string) {
    if (confirm(`確定要刪除 ${type} 嗎?`)) {
      (this.mainForm as FormGroup).removeControl(type);
      if (this.selectedType() === type) {
        this.selectedType.set(null);
      }
    }
  }

  saveAllRules() {
    if (!this.isFormDirty()) {
      alert('沒有變更需要儲存');
      return;
    }

    const typesWithError = this.typeList().filter(type => this.hasValidationError(type));
    if (typesWithError.length > 0) {
      alert(`以下規則尚有錯誤，請先修正：\n- ${typesWithError.join('\n- ')}`);
      return;
    }

    const allData: UserConfig = {};
    this.typeList().forEach(type => {
      const form = this.mainForm.controls[type];
      if (form) allData[type] = form.getRawValue();
    });

    console.log('Saving all rules:', allData);
    this.ruleService.setOriginalData(allData);
    this.originalData.set(this.ruleService.getOriginalData());
    alert('✅ 所有規則已儲存!');
  }

  resetAllRules() {
    if (!this.isFormDirty()) {
      alert('沒有變更需要重置');
      return;
    }
    if (confirm('確定要重置所有變更嗎？')) {
      const original = this.originalData();
      this.mainForm = this.ruleService.buildMainForm(original, this.typeList());
      alert('✅ 已重置所有變更');
    }
  }
}
