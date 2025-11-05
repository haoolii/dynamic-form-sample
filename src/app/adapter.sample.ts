// 目標介面 C - 統一的格式
interface UserData {
  id: string;
  fullName: string;
  emailAddress: string;
  age: number;
  isActive: boolean;
}

// 來源 A 的格式
interface SourceAData {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  birthYear: number;
  status: 'active' | 'inactive';
}

// 來源 B 的格式
interface SourceBData {
  user_id: string;
  name: string;
  contact_email: string;
  years_old: number;
  enabled: 1 | 0;
}

// Adapter 介面
interface DataAdapter<T> {
  adapt(data: T): UserData;
}

// 來源 A 的 Adapter
class SourceAAdapter implements DataAdapter<SourceAData> {
  adapt(data: SourceAData): UserData {
    const currentYear = new Date().getFullYear();

    return {
      id: data.userId.toString(),
      fullName: `${data.firstName} ${data.lastName}`,
      emailAddress: data.email,
      age: currentYear - data.birthYear,
      isActive: data.status === 'active'
    };
  }
}

// 來源 B 的 Adapter
class SourceBAdapter implements DataAdapter<SourceBData> {
  adapt(data: SourceBData): UserData {
    return {
      id: data.user_id,
      fullName: data.name,
      emailAddress: data.contact_email,
      age: data.years_old,
      isActive: data.enabled === 1
    };
  }
}

// 使用範例
class UserService {
  private adapters: Map<string, DataAdapter<any>> = new Map();

  constructor() {
    // 註冊不同來源的 adapter
    this.adapters.set('sourceA', new SourceAAdapter());
    this.adapters.set('sourceB', new SourceBAdapter());
  }

  processUser(source: string, data: any): UserData {
    const adapter = this.adapters.get(source);

    if (!adapter) {
      throw new Error(`No adapter found for source: ${source}`);
    }

    return adapter.adapt(data);
  }
}

// 測試範例
const service = new UserService();

// 來源 A 的資料
const sourceAData: SourceAData = {
  userId: 101,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  birthYear: 1990,
  status: 'active'
};

// 來源 B 的資料
const sourceBData: SourceBData = {
  user_id: 'B202',
  name: 'Jane Smith',
  contact_email: 'jane.smith@example.com',
  years_old: 28,
  enabled: 1
};

// 統一處理不同來源的資料
const userA = service.processUser('sourceA', sourceAData);
const userB = service.processUser('sourceB', sourceBData);

console.log('User from Source A:', userA);
console.log('User from Source B:', userB);

// 輸出:
// User from Source A: {
//   id: '101',
//   fullName: 'John Doe',
//   emailAddress: 'john.doe@example.com',
//   age: 35,
//   isActive: true
// }
//
// User from Source B: {
//   id: 'B202',
//   fullName: 'Jane Smith',
//   emailAddress: 'jane.smith@example.com',
//   age: 28,
//   isActive: true
// }
