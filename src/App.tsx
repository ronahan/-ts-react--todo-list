import { useState , useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Todo, TodoStatus } from './types/todo';
import { STATUS_LABELS } from './types/todo';
import { getTodos, addTodo, updateTodo, deleteTodo, reorderTodos } from './api';
import ConfirmModal from './components/ConfirmModal';
import Calendar from './components/Calendar';
import Kanban from "./components/Kanban";

// 시작~완료 사이 근무일 수 (주말 제외, 같은 날이면 0)
function workdaysBetween(start: string, end: string) {
  let count = 0;
  const cur = new Date(start);
  const last = new Date(end);
  while (cur < last) {
    cur.setDate(cur.getDate() + 1);        // 다음 날로 한 칸씩
    const dow = cur.getDay();              // 0=일, 6=토
    if (dow !== 0 && dow !== 6) count++;   // 주말 아니면 카운트
  }
  return count;
}

function App() {
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");            // 편집 중 시작일
  const [editCompletedAt, setEditCompletedAt] = useState("");   // 편집 중 완료일(완료된 할일만)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());        // 캘린더가 지금 보고 있는 월
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
  const updateM = useMutation({ 
    mutationFn: (v: { id: string; patch: { title: string; status: TodoStatus; date: string; completedAt?: string | null } }) =>
      updateTodo(v.id, v.patch),
    onMutate : async (v) =>{
      await queryClient.cancelQueries({queryKey:["todos"]});
      const prev =queryClient.getQueryData(["todos"]);
      queryClient.setQueryData(["todos"], (old:Todo[]) =>
      old.map((t)=> (t.id === v.id ?{ ...t, ...v.patch} : t))
      );
      return {prev};
    },
    onError :(_e, _v, ctx) => queryClient.setQueryData(["todos"], ctx?.prev),
    onSettled : ()=> queryClient.invalidateQueries({queryKey :["todos"]}),
   });
  const deleteM = useMutation({ mutationFn: deleteTodo, onSuccess: invalidate });
  const reorderM = useMutation({
    mutationFn: reorderTodos,
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const prev = queryClient.getQueryData<Todo[]>(["todos"]);
      queryClient.setQueryData(["todos"], (old: Todo[]) => {
        return old.map((t) => {
          const i = ids.indexOf(t.id);
          return i === -1 ? t : { ...t, priority: i };
        });
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(["todos"], ctx?.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });
  const handleAdd = () => {
    if (!selectedDate) return;
    if (input.trim() === "") return;
    addM.mutate({ title: input, date: selectedDate, status: "todo" });
    setInput("");
  };
  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.title);
    setEditDate(todo.date);
    setEditCompletedAt(todo.completedAt ?? "");
  };
  const saveEdit = (id: string) => {
    if (editText.trim() === "") return;
    const t = todos.find((x) => x.id === id);
    const status = t?.status ?? "todo";
    // 완료된 할일만 완료일을 직접 실어 보냄(수동). 아니면 자동 처리에 맡김
    const patch =
      status === "done"
        ? { title: editText, status, date: editDate, completedAt: editCompletedAt || null }
        : { title: editText, status, date: editDate };
    updateM.mutate({ id, patch });
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
    // completedAt 안 실어 보냄 → 서버가 자동 처리(옮긴 날 기록)
    updateM.mutate({ id, patch: { title: t?.title ?? "", status, date: t?.date ?? "" } });
  };

  // 선택한 날짜의 할일 - priority 낮은 순(위=1순위)으로 정렬
  const dayTodos = useMemo( ()=> todos
    .filter((t) => t.date === selectedDate)
    .sort((a, b) => a.priority - b.priority),
    [todos, selectedDate]
  );
  // 칸반용 — 미완료(할 일·진행 중)는 항상, 완료는 "완료한 달"이 보고 있는 달일 때만
  const kanbanTodos = useMemo(() => {
    const prefix = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;
    return todos.filter((t) => {
      if (t.status !== "done") return true;
      const when = t.completedAt ?? t.date;   // 완료일 기준
      return when.startsWith(prefix);
    });
  }, [todos, viewDate]);
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
          <Calendar todos={todos} current={viewDate} onChangeMonth={setViewDate} onSelectDate={setSelectedDate} />
          {selectedDate && (
          <section className="dayDetail">
            <h2>{month}월 {day}일의 할일</h2>
            <div className="formWrap">
              <input id="new-todo" type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`${month}월 ${day}일의 할일을 입력하세요`}/>
              <button type="button" className="addBtn" onClick={handleAdd}>추가</button>
            </div>
            {dayTodos.length === 0 ? (
              <p className="emptyMsg">할일이 없어요. 위에서 추가해보세요.</p>
            ) : (
            <ol className="todoList">
              {dayTodos.map((todo) => {
                const dur = todo.completedAt ? workdaysBetween(todo.date, todo.completedAt) : null;
                return (
                  <li
                    key={todo.id}
                    className="todoItem"
                    draggable={editingId !== todo.id}
                    onDragStart={() => setDragId(todo.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(todo.id)}
                  >
                    {editingId === todo.id ? (
                      <div className="editForm">
                        <input className="editTitle" type="text" value={editText} onChange={(e) => setEditText(e.target.value)} />
                        <div className="editDates">
                          <label>시작일<input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} /></label>
                          {todo.status === "done" && (
                            <label>완료일<input type="date" value={editCompletedAt} onChange={(e) => setEditCompletedAt(e.target.value)} /></label>
                          )}
                        </div>
                        <div className="rowActions">
                          <button type="button" className="primaryBtn" onClick={() => saveEdit(todo.id)}>저장</button>
                          <button type="button" className="ghostBtn" onClick={cancelEdit}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="todoRow">
                          <span className={`todoTitle ${todo.status === "done" ? "isDone" : ""}`}>{todo.title}</span>
                          <span className={`statusBadge ${todo.status}`}>{STATUS_LABELS[todo.status]}</span>
                          <div className="rowActions">
                            <button type="button" className="ghostBtn" onClick={() => startEdit(todo)}>수정</button>
                            <button type="button" className="ghostBtn danger" onClick={() => askDelete(todo.id)}>삭제</button>
                          </div>
                        </div>
                        <div className="dateLine">
                          <span>시작 {todo.date}</span>
                          {todo.completedAt && (
                            <span className="doneInfo">완료 {todo.completedAt}<span className="durPill">{dur === 0 ? "당일" : `${dur}일`}</span></span>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
            )}
          </section>
        )}
        </div>
        <Kanban todos={kanbanTodos} onChangeStatus={changeStatus} />
        {deleteTargetId && (
          <ConfirmModal message="정말 삭제하시겠습니까?" onConfirm={confirmDelete} onCancel={closeModal} />
        )}
      </main>
    </>
  );
}

export default App;
