import type { Todo, TodoStatus } from "./types/todo";

const BASE ="http://localhost:4000/api/todos";
export async function getTodos() : Promise<Todo[]>{
    const res = await fetch(BASE);
    return res.json();
}
export async function addTodo(todo:{title:string; date :string; status :TodoStatus}){
    const res =await fetch(BASE, {
        method:"POST",
        headers:{"Content-Type": "application/json"},
        body : JSON.stringify(todo),
    });
    return res.json();
}
export async function updateTodo(id:string, patch:{title: string; status: TodoStatus; date: string; completedAt?: string | null }) {
    const res = await fetch(`${BASE}/${id}`,{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(patch),
    })
    return res.json();
}

export async function deleteTodo(id: string) {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  return res.json();
}
// 순서 저장 - 새 순서대로 정렬된 id 배열을 통째로 보냄
export async function reorderTodos(ids: string[]) {
  const res = await fetch(`${BASE}/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return res.json();
}