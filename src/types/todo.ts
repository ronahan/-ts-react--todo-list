export interface Todo {
  id: string;
  title: string;
  date: string;
  status: TodoStatus;
  completed: boolean;
}
export type TodoStatus = 'todo' | 'doing' | 'done';
export const STATUS_LABELS:Record<TodoStatus,string>={
  todo:"할 일",
  doing:"진행 중",
  done:"완료"
}