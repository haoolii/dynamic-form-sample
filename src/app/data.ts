import { Injectable } from '@angular/core';
import { CaseType, Section } from './interface';
import { delay, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Data {

  constructor() { }


  getFields(section: Section, caseType: CaseType) {
    const data = {
      'Section1_A': ['Section1_A_1', 'Section1_A_2'],
      'Section1_B': ['Section1_B_1', 'Section1_B_2'],
      'Section1_C': ['Section1_C_1', 'Section1_C_2'],
      'Section2_A': ['Section2_A_1', 'Section2_A_2'],
      'Section2_B': ['Section2_B_1', 'Section2_B_2'],
      'Section2_C': ['Section2_C_1', 'Section2_C_2'],
      'Section3_A': ['Section3_A_1', 'Section3_A_2'],
      'Section3_B': ['Section3_B_1', 'Section3_B_2'],
      'Section3_C': ['Section3_C_1', 'Section3_C_2']
    }

    return of(data[`${section}_${caseType}`]).pipe(delay(300))
  }

}
