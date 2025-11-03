import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

interface TabMeta {
  label: string;
  edited: boolean;
  enabled: boolean;
}

interface ChildCondition {
  field: string;
  operator: string;
  value: any;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private fb = new FormBuilder();

  // 完整 tab 表單
  formArray = this.fb.array<FormGroup>([]);
  meta = signal<TabMeta[]>([]);
  activeIndex = signal(0);

  // 全域 enabled signal
allEnabled = signal(true);


  // 初始 config data
  private configData: Record<string, { enabled: boolean; children: ChildCondition[] }> = {
    "HELLO_WORKD": {
      enabled: true,
      children: [
        { field: "usrename", operator: "EQ", value: "unn" },
        { field: "age", operator: "EQ", value: 18 }
      ]
    },
    "PLAY": {
      enabled: true,
      children: [
        { field: "account", operator: "EQ", value: "unnhao" },
        { field: "createAt", operator: "GT", value: 100 }
      ]
    }
  };

  // meta tab list
  private tabList = ["HELLO_WORKD", "PLAY", "GAME", "HELP"];

  // 儲存原始 children 用來判斷 edited
  private initialChildren: ChildCondition[][] = [];

  constructor() {
    this.tabList.forEach((label, idx) => {
      const config = this.configData[label];
      const children = config?.children ?? [];
      this.addTab(label, children, config?.enabled ?? false);
    });
  }

  /** 建立 child form group */
  private createChildGroup(child: ChildCondition) {
    return this.fb.group({
      field: [child.field],
      operator: [child.operator],
      value: [child.value]
    });
  }

  /** 建立 tab form group */
  private createTabForm(children: ChildCondition[], enabled: boolean, idx: number) {
    const form = this.fb.group({
      enabled: [children.length > 0 ? enabled : false],
      children: this.fb.array(children.map(c => this.createChildGroup(c)))
    });

    form.valueChanges.subscribe(() => {
      const childrenArray = form.get('children') as FormArray<FormGroup>;
      const currentChildren = childrenArray.value as ChildCondition[];
      const hasChildren = currentChildren.length > 0;

      form.get('enabled')?.setValue(hasChildren, { emitEvent: false });

      const isEdited = JSON.stringify(currentChildren) !== JSON.stringify(this.initialChildren[idx]);
      const currentMeta = [...this.meta()];
      currentMeta[idx].edited = isEdited;
      currentMeta[idx].enabled = hasChildren;
      this.meta.set(currentMeta);
    });

    return form;
  }

  /** 新增 tab */
  addTab(label: string, children: ChildCondition[] = [], enabled = false) {
    const idx = this.formArray.length;
    this.initialChildren[idx] = children.map(c => ({ ...c }));

    const form = this.createTabForm(children, enabled, idx);
    this.formArray.push(form);

    this.meta.update(arr => [
      ...arr,
      { label, edited: false, enabled: children.length > 0 ? enabled : false }
    ]);

    this.activeIndex.set(this.formArray.length - 1);
  }

  removeTab(index: number) {
    this.formArray.removeAt(index);
    this.initialChildren.splice(index, 1);
    this.meta.update(arr => arr.filter((_, i) => i !== index));
    if (this.activeIndex() >= this.formArray.length) {
      this.activeIndex.set(this.formArray.length - 1);
    }
  }

  currentForm = computed(() => this.formArray.at(this.activeIndex()));
  get currentChildren() {
    const form = this.currentForm();
    return form?.get('children') as FormArray<FormGroup>;
  }

  addChild() {
    this.currentChildren.push(this.createChildGroup({ field: '', operator: 'EQ', value: '' }));
  }

  removeChild(index: number) {
    this.currentChildren.removeAt(index);
  }

  save(index: number) {
    const form = this.formArray.at(index);
    form.markAsPristine();
    const childrenArray = form.get('children') as FormArray<FormGroup>;
    this.initialChildren[index] = childrenArray.value.map(c => ({ ...c }));

    this.meta.update(arr => {
      const copy = [...arr];
      copy[index].edited = false;
      copy[index].enabled = form.get('enabled')?.value ?? true;
      return copy;
    });
  }

  submitAll() {
    this.formArray.controls.forEach(ctrl => ctrl.markAsPristine());
    this.formArray.controls.forEach((ctrl, i) => {
      const childrenArray = ctrl.get('children') as FormArray<FormGroup>;
      this.initialChildren[i] = childrenArray.value.map(c => ({ ...c }));
    });

    this.meta.update(arr =>
      arr.map((m, i) => ({
        ...m,
        edited: false,
        enabled: this.formArray.at(i).get('enabled')?.value ?? true
      }))
    );

    alert('✅ All forms submitted!');
  }

  // 監聽全域切換，更新每個 tab 的 enabled
toggleAllEnabled() {
  const enabled = this.allEnabled();
  this.formArray.controls.forEach((form: FormGroup) => {
    const usersArray = form.get('children') as FormArray<FormGroup>;
    // 如果 tab 沒有 children 就保持 disabled
    const hasChildren = usersArray.length > 0;
    form.get('enabled')?.setValue(hasChildren ? enabled : false, { emitEvent: false });
  });

  // 更新 meta
  this.meta.update(arr =>
    arr.map((m, i) => ({
      ...m,
      enabled: (this.formArray.at(i).get('enabled')?.value ?? false)
    }))
  );
}

  exit() {
    if (this.meta().some(m => m.edited)) {
      alert('⚠️ 尚有未儲存的變更！');
    } else {
      alert('✅ 安全離開。');
    }
  }

  trackByIndex(_idx: number) {
    return _idx;
  }
}
