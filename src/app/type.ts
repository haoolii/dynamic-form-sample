import { FormArray, FormControl, FormGroup } from "@angular/forms";

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
