/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Task {
  id: string;
  ert: number; // minutes
  timestamp: number;
  category?: string;
}

export interface DailyLog {
  date: string;
  tasks: Task[];
}
