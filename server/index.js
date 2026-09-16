import cors from 'cors'
import express from 'express'
import Database from 'better-sqlite3'
import { neon } from '@neondatabase/serverless'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const app = express()
const port = process.env.PORT || 4000
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null
const databasePath = process.env.DB_PATH || path.join(path.dirname(fileURLToPath(import.meta.url)), 'students.db')
const database = sql ? null : new Database(databasePath)

if (database) {
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
}

const schemaReady = sql
  ? sql`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        date_of_birth TEXT NOT NULL,
        course TEXT NOT NULL,
        year INTEGER NOT NULL,
        address TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
  : Promise.resolve()

app.use(cors())
app.use(express.json())

app.get('/api/students', async (request, response) => {
  const search = String(request.query.search || '').trim()
  try {
    await schemaReady
    const students = sql
      ? search
        ? await sql`
            SELECT * FROM students
            WHERE full_name ILIKE ${`%${search}%`}
              OR email ILIKE ${`%${search}%`}
              OR course ILIKE ${`%${search}%`}
            ORDER BY created_at DESC
          `
        : await sql`SELECT * FROM students ORDER BY created_at DESC`
      : search
        ? database.prepare(`
            SELECT * FROM students
            WHERE full_name LIKE @search OR email LIKE @search OR course LIKE @search
            ORDER BY created_at DESC
          `).all({ search: `%${search}%` })
        : database.prepare('SELECT * FROM students ORDER BY created_at DESC').all()

    response.json(students)
  } catch (error) {
    console.error(error)
    response.status(500).json({ message: 'Unable to load students.' })
  }
})

app.post('/api/students', async (request, response) => {
  const { fullName, email, phone, dateOfBirth, course, year, address } = request.body
  if (!fullName || !email || !phone || !dateOfBirth || !course || !year || !address) {
    return response.status(400).json({ message: 'Please complete every field.' })
  }

  try {
    await schemaReady
    const student = sql
      ? (await sql`
          INSERT INTO students (full_name, email, phone, date_of_birth, course, year, address)
          VALUES (${fullName}, ${email}, ${phone}, ${dateOfBirth}, ${course}, ${Number(year)}, ${address})
          RETURNING *
        `)[0]
      : (() => {
          const result = database.prepare(`
            INSERT INTO students (full_name, email, phone, date_of_birth, course, year, address)
            VALUES (@fullName, @email, @phone, @dateOfBirth, @course, @year, @address)
          `).run({ fullName, email, phone, dateOfBirth, course, year: Number(year), address })
          return database.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid)
        })()

    return response.status(201).json(student)
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
      return response.status(409).json({ message: 'A student with this email already exists.' })
    }
    return response.status(500).json({ message: 'Unable to save student.' })
  }
})

export default app

if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Student API running at http://localhost:${port}`)
  })
}
