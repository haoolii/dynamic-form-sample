import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed, effect } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Data } from './data';
import { CaseType, Section } from './interface';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  data = inject(Data);

  // 選擇狀態
  section = signal<Section | null>(null);
  caseType = signal<CaseType | null>(null);

  // 快取
  cache = signal<Record<string, string[]>>({});

  // 載入狀態
  loading = signal(false);

  // 當前欄位資料
  fields = signal<string[]>([]);

  // 可用的選項
  sections: Section[] = ['Section1', 'Section2', 'Section3'];
  caseTypes: CaseType[] = ['A', 'B', 'C'];

  // 讓 template 可以使用 Object
  Object = Object;

  // 當 section 或 caseType 改變時，載入資料
  constructor() {
    effect(() => {
      const sec = this.section();
      const type = this.caseType();

      if (sec && type) {
        this.loadFields(sec, type);
      } else {
        this.fields.set([]);
      }
    }, { allowSignalWrites: true });
  }

  onSectionChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as Section;
    this.section.set(value || null);
    this.caseType.set(null); // 重置 case type
  }

  onCaseTypeChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as CaseType;
    this.caseType.set(value || null);
  }

  private loadFields(section: Section, caseType: CaseType) {
    const cacheKey = `${section}_${caseType}`;
    const cached = this.cache()[cacheKey];

    // 如果有快取，直接使用
    if (cached) {
      this.fields.set(cached);
      return;
    }

    // 沒有快取，從 API 載入
    this.loading.set(true);
    this.data.getFields(section, caseType).subscribe({
      next: (data) => {
        this.fields.set(data);
        // 更新快取
        this.cache.update(c => ({ ...c, [cacheKey]: data }));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  // 清除快取
  clearCache() {
    this.cache.set({});
    this.fields.set([]);
  }
}
