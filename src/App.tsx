import { useState , useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TodoStatus } from './types/todo';
import { STATUS_LABELS } from './types/todo';
import { getTodos, addTodo, updateTodo, deleteTodo, reorderTodos } from './api';
import ConfirmModal from './components/ConfirmModal';
import Calendar from './components/Calendar';
import Kanban from "./components/Kanban";

function App() {
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);   // 지금 끌고 있는 할일 id

  const queryClient = useQueryClient();

  // 읽기 — 서버에서 목록 가져오기 (localStorage 대체)
  const { data: todos = [] } = useQuery({
    queryKey: ["todos"],
    queryFn: getTodos,
  });

  // 쓰기 — 성공하면 목록 다시 불러오기(invalidate)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["todos"] });
  const addM    = useMutation({ mutationFn: addTodo, onSuccess: invalidate });
  const updateM = useMutation({ mutationFn: (v: { id: string; patch: { title: string; status: TodoStatus } }) => updateTodo(v.id, v.patch), onSuccess: invalidate });
  const deleteM = useMutation({ mutationFn: deleteTodo, onSuccess: invalidate });
  const reorderM = useMutation({ mutationFn: reorderTodos, onSuccess: invalidate });

  const handleAdd = () => {
    if (!selectedDate) return;
    if (input.trim() === "") return;
    addM.mutate({ title: input, date: selectedDate, status: "todo" });
    setInput("");
  };
  const startEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditText(currentTitle);
  };
  const saveEdit = (id: string) => {
    if (editText.trim() === "") return;
    const t = todos.find((x) => x.id === id);
    updateM.mutate({ id, patch: { title: editText, status: t?.status ?? "todo" } });
    setEditingId(null);
  };
  const cancelEdit = () => setEditingId(null);
  const askDelete = (id: string) => setDeleteTargetId(id);
  const confirmDelete = () => {
    if (deleteTargetId) deleteM.mutate(deleteTargetId);
    setDeleteTargetId(null);
  };
  const closeModal = () => setDeleteTargetId(null);
  const changeStatus = (id: string, status: TodoStatus) => {
    const t = todos.find((x) => x.id === id);
    updateM.mutate({ id, patch: { title: t?.title ?? "", status } });
  };

  // 선택한 날짜의 할일 - priority 낮은 순(위=1순위)으로 정렬
  const dayTodos = useMemo( ()=> todos
    .filter((t) => t.date === selectedDate)
    .sort((a, b) => a.priority - b.priority),
    [todos, selectedDate]
  );
  // 드래그로 놓았을 때 - 새 순서 계산해서 서버 저장
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = dayTodos.map((t) => t.id);   // 현재 순서
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);                      // 끌던 애 빼고
    ids.splice(to, 0, dragId);                // 놓은 자리에 끼우고
    reorderM.mutate(ids);                     // 새 순서 저장
    setDragId(null);
  };

  const month = selectedDate ? Number(selectedDate.split("-")[1]) : 0;
  const day = selectedDate ? Number(selectedDate.split("-")[2]) : 0;

  return (
    <>
      <main className="wrapper">
        <h1>할일 관리</h1>
        <div className="top">
          <Calendar todos={todos} onSelectDate={setSelectedDate} />
          {selectedDate && (
          <section className="dayDetail">
            <h2>{month}월 {day}일의 할일</h2>
            <div className="formWrap">
              <input id="new-todo" type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`${month}월 ${day}일의 할일을 입력하세요`}/>
              <button type="button" onClick={handleAdd}>추가</button>
            </div>
            <ol>
              {dayTodos.map((todo) => (
                  <li
                    key={todo.id}
                    draggable={editingId !== todo.id}
                    onDragStart={() => setDragId(todo.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(todo.id)}
                  >
                    {editingId === todo.id ? (
                      <>
                        <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} />
                        <button type="button" onClick={() => saveEdit(todo.id)}>저장</button>
                        <button type="button" onClick={cancelEdit}>취소</button>
                      </>
                    ) : (
                      <>
                        {todo.title} - {STATUS_LABELS[todo.status]}
                        <button type="button" onClick={() => startEdit(todo.id, todo.title)}>수정</button>
                        <button type="button" onClick={() => askDelete(todo.id)}>삭제</button>
                      </>
                    )}
                  </li>
                ))}
            </ol>
          </section>
        )}
        </div>
        <Kanban todos={todos} onChangeStatus={changeStatus} />
        {deleteTargetId && (
          <ConfirmModal message="정말 삭제하시겠습니까?" onConfirm={confirmDelete} onCancel={closeModal} />
        )}
      </main>
    </>
  );
}

export default App;
