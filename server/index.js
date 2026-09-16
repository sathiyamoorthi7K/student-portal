import cors from 'cors'
import express from 'express'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const app = express()
const port = process.env.PORT || 4000
const databasePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'students.db')
const database = new Database(databasePath)

database.pragma('journal_mode = WAL')
database.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    course TEXT NOT NULL,
    year INTEGER NOT NULL,
    address TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)

app.use(cors())
app.use(express.json())

app.get('/api/students', (request, response) => {
  const search = String(request.query.search || '').trim()
  const students = search
    ? database.prepare(`
        SELECT * FROM students
        WHERE full_name LIKE @search OR email LIKE @search OR course LIKE @search
        ORDER BY created_at DESC
      `).all({ search: `%${search}%` })
    : database.prepare('SELECT * FROM students ORDER BY created_at DESC').all()

  response.json(students)
})

app.post('/api/students', (request, response) => {
  const { fullName, email, phone, dateOfBirth, course, year, address } = request.body
  if (!fullName || !email || !phone || !dateOfBirth || !course || !year || !address) {
    return response.status(400).json({ message: 'Please complete every field.' })
  }

  try {
    const result = database.prepare(`
      INSERT INTO students (full_name, email, phone, date_of_birth, course, year, address)
      VALUES (@fullName, @email, @phone, @dateOfBirth, @course, @year, @address)
    `).run({ fullName, email, phone, dateOfBirth, course, year: Number(year), address })

    const student = database.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid)
    return response.status(201).json(student)
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return response.status(409).json({ message: 'A student with this email already exists.' })
    }
    return response.status(500).json({ message: 'Unable to save student.' })
  }
})

app.listen(port, () => {
  console.log(`Student API running at http://localhost:${port}`)
})
