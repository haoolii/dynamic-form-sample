import { UserConfig } from "./type";

export const sampleData: UserConfig = {
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
