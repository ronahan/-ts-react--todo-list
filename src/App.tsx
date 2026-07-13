import {useState, useEffect} from 'react';
import type {Todo, TodoStatus} from './types/todo';
import {STATUS_LABELS} from './types/todo';
import ConfirmModal from './components/ConfirmModal';
import Calendar from './components/Calendar';
import Kanban from "./components/Kanban";

function App() {
  const [input, setInput] =useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem("todos");
    return saved ? JSON.parse(saved) : [];
  });
  const changeStatus = (id:string, status : TodoStatus) => {
    setTodos(todos.map((todo)=> (todo.id ===id ? {...todo, status} : todo)));
  };
  useEffect( ()=>{
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);
  const handleAdd =() => {
    if (!selectedDate) return; // 선택된 날짜가 없으면 추가하지 않음
    if (input.trim() === "") return;
    const newTodo : Todo ={
      id : crypto.randomUUID(),
      title : input,
      date  :selectedDate,
      status : "todo",
      completed :false, 
    };
    setTodos([...todos, newTodo]);
    setInput("");
  }
  const startEdit = (id:string, currentTitle : string) => {
    setEditingId(id);
    setEditText(currentTitle);
  }
  const saveEdit = (id:string) => {
    if (editText.trim() === "") return;
    setTodos(todos.map((todo)=> (todo.id === id? {...todo, title:editText} : todo)));
    setEditingId(null);
  }
  const cancelEdit = ()=> {
    setEditingId(null);
  }
 const askDelete = (id: string) =>{
  setDeleteTargetId(id);
 }
 const confirmDelete =()=>{
  setTodos(todos.filter((todo)=>todo.id !== deleteTargetId));
  setDeleteTargetId(null);
 }
 const closeModal = () => {
  setDeleteTargetId(null);
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
              <input id="new-todo" type="text" value={input} onChange={(e) => setInput (e.target.value)} placeholder={`${month}월 ${day}일의 할일을 입력하세요`}/>
              <button type="button" onClick={handleAdd}>추가</button>
            </div>
            <ul>
              {todos
                .filter((todo) => todo.date === selectedDate)
                .map((todo) => (
                  <li key={todo.id}>
                    {editingId === todo.id ? (
                      <>
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                        />
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
            </ul>
          </section>
        )}
        </div>
        <Kanban todos={todos} onChangeStatus={changeStatus} />
        {deleteTargetId && (
          <ConfirmModal
            message="정말 삭제하시겠습니까?"
            onConfirm={confirmDelete}
            onCancel={closeModal}
          />
        )}

      </main>
    </>
  )
}

export default App;
