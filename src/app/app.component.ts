import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

interface TabMeta {
  label: string;
  edited: boolean;
  enabled: boolean;
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

  // 一個 FormArray 裝多個 tab formGroup
  formArray = this.fb.array<FormGroup>([]);
  meta = signal<TabMeta[]>([]);
  activeIndex = signal(0);

  constructor() {
    this.addTab('Team A');
    this.addTab('Team B');
  }

  /** 建立一個 tab form group */
  private createTabForm() {
    return this.fb.group({
      enabled: [true],
      users: this.fb.array([
        this.createUserGroup(),
      ])
    });
  }

  /** 建立一個 user form group */
  private createUserGroup() {
    return this.fb.group({
      name: [''],
      email: [''],
    });
  }

  /** 新增一個 tab */
  addTab(label = `Team ${this.formArray.length + 1}`) {
    const form = this.createTabForm();

    this.formArray.push(form);
    this.meta.update(arr => [...arr, { label, edited: false, enabled: true }]);
    this.activeIndex.set(this.formArray.length - 1);

    const idx = this.formArray.length - 1;
    form.valueChanges.subscribe(() => {
      const currentMeta = this.meta();
      const newState = [...currentMeta];
      newState[idx].enabled = form.get('enabled')?.value ?? true;
      newState[idx].edited = true;
      this.meta.set(newState);
    });
  }

  /** 移除 tab */
  removeTab(index: number) {
    this.formArray.removeAt(index);
    this.meta.update(arr => arr.filter((_, i) => i !== index));
    if (this.activeIndex() >= this.formArray.length) {
      this.activeIndex.set(this.formArray.length - 1);
    }
  }

  /** 目前的 tab form */
  currentForm = computed(() => this.formArray.at(this.activeIndex()));

  /** 取得目前 tab 裡的 user FormArray */
  get currentUsers() {
    const form = this.currentForm();
    return form?.get('users') as FormArray<FormGroup>;
  }

  /** 新增一個 user */
  addUser() {
    this.currentUsers.push(this.createUserGroup());
  }

  /** 移除指定 user */
  removeUser(index: number) {
    this.currentUsers.removeAt(index);
  }

  /** 儲存單一 tab */
  save(index: number) {
    const form = this.formArray.at(index);
    console.log('Save', this.meta()[index].label, form.value);
    form.markAsPristine();
    this.meta.update(arr => {
      const copy = [...arr];
      copy[index].edited = false;
      copy[index].enabled = form.get('enabled')?.value ?? true;
      return copy;
    });
  }

  /** 提交全部 */
  submitAll() {
    this.formArray.controls.forEach(ctrl => ctrl.markAsPristine());
    this.meta.update(arr =>
      arr.map((m, i) => ({
        ...m,
        edited: false,
        enabled: this.formArray.at(i).get('enabled')?.value ?? true,
      }))
    );
    console.log('Submit all', this.formArray.value);
    alert('✅ All forms submitted!');
  }

  /** 離開時檢查未儲存變更 */
  exit() {
    if (this.meta().some(m => m.edited)) {
      alert('⚠️ 尚有未儲存的變更！');
    } else {
      alert('✅ 安全離開。');
    }
  }
}
