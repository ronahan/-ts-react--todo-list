import type {Todo, TodoStatus} from '../types/todo';
import styles from './Calendar.module.css';

// 상태별 색 클래스 (todo=기본 하늘색이라 빈 값, doing=파랑, done=초록)
const STATUS_STYLE: Record<TodoStatus, string> = {
  todo: '',
  doing: styles.doing,
  done: styles.done,
};

interface CalendarProps {
  todos: Todo[];
  current: Date;
  onChangeMonth: (date: Date) => void;
  onSelectDate:(date:string)=>void;
}
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
function Calendar({todos, current, onChangeMonth, onSelectDate}: CalendarProps) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const startWeekday = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const cells :(number | null)[] =[];
    for (let i =0; i<startWeekday; i++)cells.push(null);
    for (let d =1; d <= lastDate; d++) cells.push(d);
    const prevMonth = ()=>{onChangeMonth(new Date(year, month -1, 1))};
    const nextMonth = ()=>{onChangeMonth(new Date(year, month +1, 1))};
    return( 
        <section className={styles.calendar}>
            <header className={styles.head}>
                <button type="button" onClick={prevMonth}>&lt;</button>
                <h3>{year}년 {month +1}월</h3>
                <button type="button" onClick={nextMonth}>&gt;</button>
            </header>
        <div className={styles.grid}>
            {WEEKDAYS.map((day) => (
                <div key={day} className={styles.weekday}>{day}</div>
            ))}
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={i} className={styles.cell}/>
              }
              const dateStr=`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              // 완료된 할일은 완료한 날 칸에, 나머지는 시작일 칸에
              const dayTodos = todos.filter((todo) => {
                const cellDate = todo.status === "done" ? todo.completedAt ?? todo.date : todo.date;
                return cellDate === dateStr;
              });
              return (
                <div key={i} className={styles.cell} onClick={() => onSelectDate(dateStr)}>
                  <span className={styles.dayNum}>{day}</span>
                  <ul className={styles.todoList}>
                    {dayTodos.map((todo) => (
                      <li key={todo.id} className={`${styles.todoItem} ${STATUS_STYLE[todo.status]}`}>
                        {todo.title}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
        </div>
        </section>
        );
}
export default Calendar;