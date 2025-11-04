import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ConditionRule, ConditionRuleForm, OrGroup, OrGroupForm, RootRule, RootRuleForm, UserConfig } from './type';
import { sampleData } from './sample';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
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

   // 單一主 Form - 包含所有 type 的規則
   mainForm!: FormGroup<Record<string, FormGroup<RootRuleForm>>>;
   // mainForm!: FormGroup<Record<string, FormGroup<RootRuleForm>>>;

   // 原始資料 - 用於比對是否有變更
   originalData = signal<UserConfig>({});

   constructor() {
     this.initializeForm();
   }

   // 初始化 Form
   initializeForm() {
     // 儲存原始資料
     this.originalData.set(JSON.parse(JSON.stringify(sampleData)));

     // 建立 FormGroup
     const controls: Record<string, FormGroup<RootRuleForm>> = {};

     this.typeList().forEach(type => {
       if (sampleData[type]) {
         controls[type] = this.createRootRuleForm(sampleData[type]);
       }
     });

     this.mainForm = new FormGroup(controls);
   }

   // 選擇類型
   selectType(type: string) {
     this.selectedType.set(type);
   }

   // 檢查是否有規則
   hasRules(type: string): boolean {
     return !!this.mainForm.controls[type];
   }

   // 取得規則數量
   getRuleCount(type: string): number {
     const form = this.mainForm.controls[type];
     if (!form) return 0;
     return form.controls.children.length;
   }

   // 檢查特定 type 是否有變更 (Deep Compare)
   isTypeDirty(type: string): boolean {
     const currentForm = this.mainForm.controls[type];
     const originalRule = this.originalData()[type];

     // 如果原本沒有，現在有 = dirty
     if (!originalRule && currentForm) return true;

     // 如果原本有，現在沒有 = dirty
     if (originalRule && !currentForm) return true;

     // 都沒有 = not dirty
     if (!originalRule && !currentForm) return false;

     // 深度比對
     const currentValue = currentForm!.getRawValue();
     return JSON.stringify(originalRule) !== JSON.stringify(currentValue);
   }

   // 檢查整個 form 是否有變更
   isFormDirty(): boolean {
     return this.typeList().some(type => this.isTypeDirty(type));
   }

   // 建立新規則
   createNewRule(type: string) {
     const newRule: RootRule = {
       enabled: true,
       operator: 'AND',
       children: [
         {
           enabled: true,
           operator: 'OR',
           children: [
             { field: '', operator: 'EQ', value: '', enabled: true }
           ]
         }
       ]
     };

     this.mainForm.addControl(type, this.createRootRuleForm(newRule));
   }

   // 建立 RootRuleForm
   createRootRuleForm(data?: RootRule): FormGroup<RootRuleForm> {
     return new FormGroup<RootRuleForm>({
       enabled: new FormControl(data?.enabled ?? true, { nonNullable: true }),
       operator: new FormControl<'AND'>('AND', { nonNullable: true }),
       children: new FormArray(
         data?.children.map(group => this.createOrGroupForm(group)) || []
       )
     });
   }

   // 建立 OrGroupForm
   createOrGroupForm(data?: OrGroup): FormGroup<OrGroupForm> {
     return new FormGroup<OrGroupForm>({
       enabled: new FormControl(data?.enabled ?? true, { nonNullable: true }),
       operator: new FormControl<'OR'>('OR', { nonNullable: true }),
       children: new FormArray(
         data?.children.map(rule => this.createConditionForm(rule)) || []
       )
     });
   }

   // 建立 ConditionForm
   createConditionForm(data?: ConditionRule): FormGroup<ConditionRuleForm> {
     return new FormGroup<ConditionRuleForm>({
       field: new FormControl(data?.field || '', { nonNullable: true }),
       operator: new FormControl(data?.operator || 'EQ', { nonNullable: true }),
       value: new FormControl(data?.value || '', { nonNullable: true }),
       enabled: new FormControl(
         typeof data?.enabled === 'string' ? data.enabled === 'true' : data?.enabled ?? true,
         { nonNullable: true }
       )
     });
   }

   // 取得 OR Groups
   getOrGroups(form: FormGroup<RootRuleForm>): FormGroup<OrGroupForm>[] {
     return form.controls.children.controls as FormGroup<OrGroupForm>[];
   }

   // 取得 Conditions
   getConditions(orGroup: FormGroup<OrGroupForm>): FormGroup<ConditionRuleForm>[] {
     return orGroup.controls.children.controls as FormGroup<ConditionRuleForm>[];
   }

   // 新增 OR Group
   addOrGroup(type: string) {
     const form = this.mainForm.controls[type];
     if (!form) return;

     form.controls.children.push(this.createOrGroupForm({
       enabled: true,
       operator: 'OR',
       children: [{ field: '', operator: 'EQ', value: '', enabled: true }]
     }));
   }

   // 移除 OR Group
   removeOrGroup(type: string, index: number) {
     const form = this.mainForm.controls[type];
     if (!form) return;
     form.controls.children.removeAt(index);
   }

   // 新增條件
   addCondition(type: string, groupIndex: number) {
     const form = this.mainForm.controls[type];
     if (!form) return;

     const orGroup = form.controls.children.at(groupIndex) as FormGroup<OrGroupForm>;
     orGroup.controls.children.push(this.createConditionForm());
   }

   // 移除條件
   removeCondition(type: string, groupIndex: number, conditionIndex: number) {
     const form = this.mainForm.controls[type];
     if (!form) return;

     const orGroup = form.controls.children.at(groupIndex) as FormGroup<OrGroupForm>;
     orGroup.controls.children.removeAt(conditionIndex);
   }

   // 刪除規則
   deleteRule(type: string) {
     if (confirm(`確定要刪除 ${type} 嗎?`)) {
       // this.mainForm.removeControl(type);
         (this.mainForm as FormGroup).removeControl(type);

     }
   }

   // 儲存全部規則
   saveAllRules() {
     if (!this.isFormDirty()) {
       alert('沒有變更需要儲存');
       return;
     }

     const allData: UserConfig = {};

     this.typeList().forEach(type => {
       const form = this.mainForm.controls[type];
       if (form) {
         allData[type] = form.getRawValue();
       }
     });

     console.log('Saving all rules:', allData);

     // 更新原始資料
     this.originalData.set(JSON.parse(JSON.stringify(allData)));

     alert('✅ 所有規則已儲存!');
   }

   // 重置全部規則
   resetAllRules() {
     if (!this.isFormDirty()) {
       alert('沒有變更需要重置');
       return;
     }

     if (confirm('確定要重置所有變更嗎？')) {
       // 重建 form
       const original = this.originalData();
       const controls: Record<string, FormGroup<RootRuleForm>> = {};

       this.typeList().forEach(type => {
         if (original[type]) {
           controls[type] = this.createRootRuleForm(original[type]);
         }
       });

       this.mainForm = new FormGroup(controls);
       alert('✅ 已重置所有變更');
     }
   }
}
