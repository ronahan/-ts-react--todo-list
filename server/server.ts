import express from "express";
import cors from "cors";
import {DatabaseSync} from "node:sqlite"
import crypto from "crypto";

const app = express();
app.use(cors()); // 다른 출처(프론트엔드)에서 오는 요청을 허용
app.use(express.json()); // 요청 본문(json)을 파싱


const db = new DatabaseSync("todos.db");
db.exec(`
	CREATE TABLE IF NOT EXISTS todos(
		id  TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		date TEXT,
		status TEXT NOT NULL DEFAULT 'todo',
		priority INTEGER NOT NULL DEFAULT 0,
		completedAt TEXT
	)
`);
// 기존 DB용 마이그레이션 - 컬럼 없으면 추가
const cols = db.prepare("PRAGMA table_info(todos)").all() as { name: string }[];
if (!cols.some((c) => c.name === "priority")) {
	db.exec("ALTER TABLE todos ADD COLUMN priority INTEGER NOT NULL DEFAULT 0");
}
if (!cols.some((c) => c.name === "completedAt")) {
	db.exec("ALTER TABLE todos ADD COLUMN completedAt TEXT");
	// 이미 완료된 기존 할일은 완료일자가 없으니 시작일로 백필(안 그러면 캘린더에서 사라짐)
	db.exec("UPDATE todos SET completedAt = date WHERE status = 'done' AND completedAt IS NULL");
}
const count = db.prepare("SELECT COUNT(*) AS n FROM todos").get() as {n:number}; // demo checking
if (count.n === 0){
	db.prepare("INSERT INTO todos(id, title, date, status) VALUES (?,?,?,?)")
	.run(crypto.randomUUID(), "first todo","2026-07-16", "todo");
}
const listStmt = db.prepare("SELECT * FROM todos ORDER BY date, priority");
const insertStmt = db.prepare("INSERT INTO todos(id, title, date, status, priority) VALUES(?,?,?,?,?)");
// 완료로 바뀌면 오늘 날짜 기록, 완료에서 빠지면 지움, 그대로면 유지
// :status 처럼 '이름 있는 파라미터'라 여러 번 써도 값은 한 번만 넘기면 됨
const updateStmt = db.prepare(`
	UPDATE todos
	SET title = :title,
	    status = :status,
	    completedAt = CASE
	      WHEN :status = 'done' AND completedAt IS NULL THEN date('now','localtime')
	      WHEN :status <> 'done' THEN NULL
	      ELSE completedAt
	    END
	WHERE id = :id
`);
const deleteStmt = db.prepare("DELETE FROM todos WHERE id = ?");
// 같은 날짜 안에서 제일 큰 priority (새 할일은 맨 아래로)
const maxPriorityStmt = db.prepare("SELECT COALESCE(MAX(priority), 0) AS m FROM todos WHERE date = ?");
// 순서 저장 - id 별 priority 갱신
const reorderStmt = db.prepare("UPDATE todos SET priority = ? WHERE id = ?");

app.get("/api/todos",(req, res) => {
	res.json(listStmt.all());
})
app.post("/api/todos", (req, res)=>{
	const {title, date, status} = req.body;
	const id = crypto.randomUUID();
	// 그 날짜 맨 아래로 붙이기 → 제일 큰 priority + 1
	const { m } = maxPriorityStmt.get(date ?? null) as { m: number };
	const priority = m + 1;
	insertStmt.run(id, title, date ?? null, status ?? "todo", priority);
	res.json({ id, title, date, status: status ?? "todo", priority })
});
// ⚠️ /:id 보다 반드시 위에! (안 그러면 "reorder"를 id로 착각함)
app.put("/api/todos/reorder", (req, res) => {
	const { ids } = req.body as { ids: string[] };  // 새 순서대로 담긴 id 배열
	ids.forEach((id, index) => reorderStmt.run(index, id));  // priority = 순서(0,1,2...)
	res.json({ ok: true });
});
app.put("/api/todos/:id",(req, res) => {
	const{title, status} =req.body;
	updateStmt.run({ title, status, id: req.params.id });
	res.json({ok:true});
})
app.delete("/api/todos/:id", (req,res)=>{
	deleteStmt.run(req.params.id);
	res.json({ok:true});
});
app.listen(4000,() => console.log("server is running on : http://localhost:4000"))