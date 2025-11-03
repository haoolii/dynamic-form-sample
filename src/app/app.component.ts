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

  formArray = this.fb.array<FormGroup>([]);
  meta = signal<TabMeta[]>([]);
  activeIndex = signal(0);

  private initialUsers: { name: string; email: string }[][] = [];

  constructor() {
    const initialData = {
      A: { enabled: false, data: [] },
      B: { enabled: true, data: [
        { name: 'Alice', email: 'alice@test.com' },
        { name: 'Bob', email: 'bob@test.com' }
      ]},
      C: { enabled: false, data: [] }
    };

    Object.entries(initialData).forEach(([label, tab]) => {
      this.addTab(label, tab.data);
    });
  }

  private createUserGroup(name = '', email = '') {
    return this.fb.group({ name: [name], email: [email] });
  }

  private createTabForm(users: { name: string; email: string }[], idx: number) {
    const form = this.fb.group({
      enabled: [users.length > 0],
      users: this.fb.array(users.map(u => this.createUserGroup(u.name, u.email)))
    });

    form.valueChanges.subscribe(() => {
      const usersArray = form.get('users') as FormArray<FormGroup>;
      const currentUsers = usersArray.value as { name: string; email: string }[];
      const hasUsers = currentUsers.length > 0;

      form.get('enabled')?.setValue(hasUsers, { emitEvent: false });

      const isEdited = JSON.stringify(currentUsers) !== JSON.stringify(this.initialUsers[idx]);
      const currentMeta = [...this.meta()];
      currentMeta[idx].edited = isEdited;
      currentMeta[idx].enabled = hasUsers;
      this.meta.set(currentMeta);
    });

    return form;
  }

  addTab(label: string, users: { name: string; email: string }[] = []) {
    const idx = this.formArray.length;
    this.initialUsers[idx] = users.map(u => ({ ...u }));

    const form = this.createTabForm(users, idx);
    this.formArray.push(form);

    this.meta.update(arr => [
      ...arr,
      { label, edited: false, enabled: users.length > 0 }
    ]);

    this.activeIndex.set(this.formArray.length - 1);
  }

  removeTab(index: number) {
    this.formArray.removeAt(index);
    this.initialUsers.splice(index, 1);
    this.meta.update(arr => arr.filter((_, i) => i !== index));
    if (this.activeIndex() >= this.formArray.length) {
      this.activeIndex.set(this.formArray.length - 1);
    }
  }

  currentForm = computed(() => this.formArray.at(this.activeIndex()));
  get currentUsers() {
    const form = this.currentForm();
    return form?.get('users') as FormArray<FormGroup>;
  }

  addUser() {
    this.currentUsers.push(this.createUserGroup());
  }

  removeUser(index: number) {
    this.currentUsers.removeAt(index);
  }

  save(index: number) {
    const form = this.formArray.at(index);
    form.markAsPristine();
    const usersArray = form.get('users') as FormArray<FormGroup>;
    this.initialUsers[index] = usersArray.value.map(u => ({ ...u }));

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
      const usersArray = ctrl.get('users') as FormArray<FormGroup>;
      this.initialUsers[i] = usersArray.value.map(u => ({ ...u }));
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

  exit() {
    if (this.meta().some(m => m.edited)) {
      alert('⚠️ 尚有未儲存的變更！');
    } else {
      alert('✅ 安全離開。');
    }
  }

  // @for trackBy
  trackByIndex(_idx: number) {
    return _idx;
  }
}
