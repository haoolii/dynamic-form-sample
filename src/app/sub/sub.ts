import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-sub',
  standalone: true,
  imports: [],
  template: `<p>sub works!</p>`,
  styleUrl: './sub.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sub { }
