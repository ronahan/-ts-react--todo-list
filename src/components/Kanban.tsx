import type {Todo, TodoStatus} from '../types/todo'
import { STATUS_LABELS } from '../types/todo';
import styles from './Kanban.module.css'

interface KanbanProps {
    todos : Todo[];
    onChangeStatus : (id:string, statu: TodoStatus) => void;
}
const COLUMNS:TodoStatus[] = ["todo", "doing", "done"];
// 뱃지 색 클래스 (캘린더와 동일: todo=하늘, doing=파랑, done=초록)
const BADGE_STYLE: Record<TodoStatus, string> = {
    todo: styles.badgeTodo,
    doing: styles.badgeDoing,
    done: styles.badgeDone,
};
function Kanban({todos , onChangeStatus} : KanbanProps) {
    return (
        <section className={styles.board}> 
            {COLUMNS.map((col) => (
                <div key={col} className={styles.column} onDragOver={(e)=> e.preventDefault()} onDrop={(e)=> {
                    const id = e.dataTransfer.getData("id");
                    onChangeStatus(id, col);
                }}>
                    <h3>{STATUS_LABELS[col]}</h3>
                    <ul className={styles.cardList}>
                        {todos
                            .filter((todo) => todo.status === col)
                            .map((todo) => (
                                <li key={todo.id} className={styles.card} draggable onDragStart={(e)=>{e.dataTransfer.setData("id", todo.id)}}>
                                    <span className={`${styles.badge} ${BADGE_STYLE[todo.status]}`}>{STATUS_LABELS[todo.status]}</span>
                                    <span>{todo.title}</span>
                                    <small className={styles.cardDate}>{todo.date}</small>
                                </li>
                            ))}
                    </ul>
                </div>
            ))}
        </section>
    );
}
export default Kanban;