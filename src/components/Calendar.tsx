import type {Todo} from '../types/todo';
import styles from './Calendar.module.css';
import { useState } from 'react';

interface CalendarProps {
  todos: Todo[];
  onSelectDate:(date:string)=>void;
}
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
function Calendar({todos, onSelectDate}: CalendarProps) {
    const[current, setCurrent] = useState(new Date());
    const year = current.getFullYear();
    const month = current.getMonth();
    const startWeekday = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const cells :(number | null)[] =[];
    for (let i =0; i<startWeekday; i++)cells.push(null);
    for (let d =1; d <= lastDate; d++) cells.push(d);
    const prevMonth = ()=>{setCurrent(new Date(year, month -1, 1))};
    const nextMonth = ()=>{setCurrent(new Date(year, month +1, 1))};
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
              const dayTodos = todos.filter((todo)=>todo.date === dateStr);
              return (
                <div key={i} className={styles.cell} onClick={() => onSelectDate(dateStr)}>
                  <span className={styles.dayNum}>{day}</span>
                  <ul className={styles.todoList}>
                    {dayTodos.map((todo) => (
                      <li key={todo.id} className = {styles.todoItem}>
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