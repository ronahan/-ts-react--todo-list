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
		status TEXT NOT NULL DEFAULT 'todo'
	)
`);
const count = db.prepare("SELECT COUNT(*) AS n FROM todos").get() as {n:number}; // demo checking
if (count.n === 0){
	db.prepare("INSERT INTO todos(id, title, date, status) VALUES (?,?,?,?)")
	.run(crypto.randomUUID(), "first todo","2026-07-16", "todo");
}
const listStmt = db.prepare("SELECT * FROM todos ORDER BY date");
const insertStmt = db.prepare("INSERT INTO todos(id, title, date, status) VALUES(?,?,?,?)");
const updateStmt = db.prepare("UPDATE todos SET title = ?, status = ? WHERE id = ?");
const deleteStmt = db.prepare("DELETE FROM todos WHERE id = ?");

app.get("/api/todos",(req, res) => {
	res.json(listStmt.all());
})
app.post("/api/todos", (req, res)=>{
	const {title, date, status} = req.body;
	const id = crypto.randomUUID();
	insertStmt.run(id,title,date ?? null, status ?? "todo");
	res.json({id,title,date,status: status ?? "todo"})
});
app.put("/api/todos/:id",(req, res) => {
	const{title, status} =req.body;
	updateStmt.run(title, status, req.params.id);
	res.json({ok:true});
})
app.delete("/api/todos/:id", (req,res)=>{
	deleteStmt.run(req.params.id);
	res.json({ok:true});
});
app.listen(4000,() => console.log("server is running on : http://localhost:4000"))