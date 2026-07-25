interface AdminLog {
  id: string;
  timestamp: string;
  type: 'system' | 'webhook' | 'finops';
  message: string;
  payload?: unknown;
}

class AdminLogger {
  private static logs: AdminLog[] = [];

  static log(type: 'system' | 'webhook' | 'finops', message: string, payload?: unknown) {
    const newLog: AdminLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      type,
      message,
      payload
    };
    this.logs.unshift(newLog);
    if (this.logs.length > 100) {
      this.logs.pop();
    }
  }

  static getLogs(): AdminLog[] {
    return this.logs;
  }
}

export { AdminLogger };
export type { AdminLog };
