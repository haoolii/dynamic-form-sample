// ============ 型別定義 ============
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';

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

// ============ Component ============
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="rule-manager">
      <!-- 左側: Type List -->
      <div class="sidebar">
        <h3>Rule Types</h3>
        <ul class="type-list">
          @for (type of typeList(); track type) {
            <li
              [class.active]="selectedType() === type"
              (click)="selectType(type)">
              <span class="type-name">
                @if (isTypeDirty(type)) {
                  <span class="dirty-indicator"></span>
                }
                {{ type }}
                @if (hasValidationError(type)) {
                  <span class="error-indicator"></span>
                }
              </span>
              @if (hasRules(type)) {
                <span class="badge">{{ getRuleCount(type) }}</span>
              }
            </li>
          }
        </ul>

        <!-- 全域操作按鈕 -->
        <div class="sidebar-actions">
          <button
            class="btn-success btn-block"
            [disabled]="!isFormDirty()"
            (click)="saveAllRules()">
            💾 儲存全部
          </button>
          <button
            class="btn-secondary btn-block"
            [disabled]="!isFormDirty()"
            (click)="resetAllRules()">
            ↺ 重置全部
          </button>
           <button
            class="btn-primary btn-block"
            (click)="toggleReadonly()">
            {{ readonly() ? '解除唯讀' : '設定唯讀' }}
          </button>
        </div>
      </div>

      <!-- 右側: Form -->
      <div class="content">
        @if (selectedType(); as type) {
          <div class="form-header">
            <h2>
              {{ type }}
              @if (isTypeDirty(type)) {
                <span class="dirty-badge">已修改</span>
              }
            </h2>
            @if (!hasRules(type)) {
              <button class="btn-primary" (click)="createNewRule(type)" [disabled]="readonly()" >
                + 新增第一筆規則
              </button>
            }
          </div>

          @if (mainForm.controls[type]; as typeForm) {
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
                @for (orGroup of getOrGroups(typeForm); track orGroup; let i = $index) {
                  <div class="or-group-wrapper">
                    <div class="group-header">
                      <div class="group-controls">
                        <label>
                          <input type="checkbox" [formControl]="orGroup.controls.enabled">
                          啟用群組 #{{ i + 1 }}
                        </label>
                        <span class="operator-badge or">OR</span>
                      </div>
                      <button
                        type="button"
                        class="btn-danger btn-sm"
                        (click)="removeOrGroup(type, i)" [disabled]="readonly()">
                        刪除群組
                      </button>
                    </div>

                    <!-- OR Group Rules -->
                    <div class="rules-list">
                      @for (rule of getConditions(orGroup); track rule; let j = $index) {
                        <div class="rule-item">
                          <label class="checkbox">
                            <input type="checkbox" [formControl]="rule.controls.enabled">
                          </label>

                          <select [formControl]="rule.controls.field" class="field-select">
                            <option value="">選擇欄位</option>
                            <option value="assigen">Assigen</option>
                            <option value="comment">Comment</option>
                            <option value="user">User</option>
                            <option value="status">Status</option>
                            <option value="priority">Priority</option>
                          </select>

                          <select [formControl]="rule.controls.operator" class="operator-select">
                            <option value="EQ">等於 (=)</option>
                            <option value="!EQ">不等於 (≠)</option>
                            <option value="CTN">包含</option>
                            <option value="GT">大於 (>)</option>
                            <option value="LT">小於 (<)</option>
                          </select>

                          <input
                            type="text"
                            [formControl]="rule.controls.value"
                            placeholder="輸入值"
                            class="value-input"
                            [disabled]="readonly()">

                          <button
                            type="button"
                            class="btn-danger btn-icon"
                            (click)="removeCondition(type, i, j)"
                            [disabled]="readonly()">
                            ✕
                          </button>
                        </div>
                      }

                      <button
                        type="button"
                        class="btn-secondary btn-sm"
                        (click)="addCondition(type, i)"
                        [disabled]="readonly()">
                        + 新增條件
                      </button>
                    </div>
                  </div>
                }
              </div>

              <!-- Add OR Group Button -->
              <button
                type="button"
                class="btn-primary"
                (click)="addOrGroup(type)"
                 [disabled]="readonly()">
                + 新增 OR 群組
              </button>

              <!-- Actions -->
              <div class="form-actions">
                <button
                  type="button"
                  class="btn-danger"
                  (click)="deleteRule(type)"
                   [disabled]="readonly()">
                  刪除此規則
                </button>
              </div>
            </div>
          }
        } @else {
          <div class="empty-state">
            <p>請從左側選擇一個規則類型</p>
          </div>
        }
      </div>

      <pre>
        {{ mainForm.value | json }}
      </pre>
    </div>
  `,
  styles: [`

    .rule-manager {
      display: flex;
      height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

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

    .content {
      flex: 1;
      padding: 30px;
      overflow-y: auto;
    }

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

    .operator-badge.or {
      background: #8250df;
    }

    .and-groups {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 20px;
    }

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

    .rules-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

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

    .btn-primary, .btn-secondary, .btn-success, .btn-danger {
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

    .btn-secondary {
      background: #6e7781;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #57606a;
    }

    .btn-success {
      background: #1a7f37;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #116329;
    }

    .btn-danger {
      background: #cf222e;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #a40e26;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 13px;
    }

    .btn-icon {
      width: 32px;
      height: 32px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-block {
      width: 100%;
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

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #6e7781;
    }

    label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
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
  `]
})
export class AppComponent {
  // Signals
  typeList = signal<string[]>([
    'TYPE_A_RULE',
    'TYPE_B_RULE',
    'TYPE_C_RULE',
    'TYPE_D_RULE',
    'TYPE_E_RULE'
  ]);

  selectedType = signal<string | null>(null);
  readonly = signal(false); // <- 新增 readonly 控制整個 form & button

  mainForm!: FormGroup<Record<string, FormGroup<RootRuleForm>>>;
  originalData = signal<UserConfig>({});

  constructor() {
    this.initializeForm();
  }

  toggleReadonly() {
    this.readonly.update(v => !v);
    if (this.readonly()) {
      this.mainForm.disable({ emitEvent: false });
    } else {
      this.mainForm.enable({ emitEvent: false });
    }
  }

  initializeForm() {
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

    const controls: Record<string, FormGroup<RootRuleForm>> = {};
    this.typeList().forEach(type => {
      if (sampleData[type]) {
        controls[type] = this.createRootRuleForm(sampleData[type]);
      }
    });

    this.mainForm = new FormGroup(controls);
  }

  selectType(type: string) { this.selectedType.set(type); }

  hasRules(type: string): boolean { return !!this.mainForm.controls[type]; }
  getRuleCount(type: string): number {
    const form = this.mainForm.controls[type];
    if (!form) return 0;
    return form.controls.children.length;
  }

  isTypeDirty(type: string): boolean {
    const currentForm = this.mainForm.controls[type];
    const originalRule = this.originalData()[type];
    if (!originalRule && currentForm) return true;
    if (originalRule && !currentForm) return true;
    if (!originalRule && !currentForm) return false;
    return JSON.stringify(originalRule) !== JSON.stringify(currentForm!.getRawValue());
  }

  isFormDirty(): boolean { return this.typeList().some(type => this.isTypeDirty(type)); }

  createNewRule(type: string) {
    const newRule: RootRule = {
      enabled: true,
      operator: 'AND',
      children: [{ enabled: true, operator: 'OR', children: [{ field: '', operator: 'EQ', value: '', enabled: true }] }]
    };
    this.mainForm.addControl(type, this.createRootRuleForm(newRule));
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

  getOrGroups(form: FormGroup<RootRuleForm>): FormGroup<OrGroupForm>[] {
    return form.controls.children.controls as FormGroup<OrGroupForm>[];
  }

  getConditions(orGroup: FormGroup<OrGroupForm>): FormGroup<ConditionRuleForm>[] {
    return orGroup.controls.children.controls as FormGroup<ConditionRuleForm>[];
  }

  addOrGroup(type: string) {
    const form = this.mainForm.controls[type];
    if (!form) return;
    form.controls.children.push(this.createOrGroupForm({ enabled: true, operator: 'OR', children: [{ field: '', operator: 'EQ', value: '', enabled: true }] }));
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
    orGroup.controls.children.push(this.createConditionForm());
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
    }
  }

saveAllRules() {
  if (!this.isFormDirty()) {
    alert('沒有變更需要儲存');
    return;
  }

  // 檢查是否有任何驗證錯誤
  const typesWithError = this.typeList().filter(type => this.hasValidationError(type));
  if (typesWithError.length > 0) {
    alert(`以下規則尚有錯誤，請先修正：\n- ${typesWithError.join('\n- ')}`);
    return; // 阻止儲存
  }

  // 儲存資料
  const allData: UserConfig = {};
  this.typeList().forEach(type => {
    const form = this.mainForm.controls[type];
    if (form) allData[type] = form.getRawValue();
  });
  console.log('Saving all rules:', allData);
  this.originalData.set(JSON.parse(JSON.stringify(allData)));
  alert('✅ 所有規則已儲存!');
}

  resetAllRules() {
    if (!this.isFormDirty()) { alert('沒有變更需要重置'); return; }
    if (confirm('確定要重置所有變更嗎？')) {
      const original = this.originalData();
      const controls: Record<string, FormGroup<RootRuleForm>> = {};
      this.typeList().forEach(type => {
        if (original[type]) controls[type] = this.createRootRuleForm(original[type]);
      });
      this.mainForm = new FormGroup(controls);
      alert('✅ 已重置所有變更');
    }
  }

  // ========= 新增驗證錯誤檢查 =========
  hasValidationError(type: string): boolean {
    const form = this.mainForm.controls[type];
    if (!form) return false;
    const orGroups = this.getOrGroups(form);
    for (const group of orGroups) {
      const rules = this.getConditions(group);
      for (const rule of rules) {
        if (rule.invalid) return true;
      }
    }
    return false;
  }
}
