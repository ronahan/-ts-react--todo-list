export interface Todo {
  id: string;
  title: string;
  date: string;
  status: TodoStatus;
  completed: boolean;
  priority: number;   // 낮을수록 위(1순위). 같은 날짜 안에서의 순서
}
export type TodoStatus = 'todo' | 'doing' | 'done';
export const STATUS_LABELS:Record<TodoStatus,string>={
  todo:"할 일",
  doing:"진행 중",
  done:"완료"
}