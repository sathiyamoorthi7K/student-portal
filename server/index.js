import cors from 'cors'
import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import express from 'express'
import Database from 'better-sqlite3'
import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const app = express()
const port = process.env.PORT || 4000
const jwtSecret = process.env.JWT_SECRET || 'local-development-secret-change-me'
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
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
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
    `.then(() => sql`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
  : Promise.resolve()

if (!jwtSecret) {
  throw new Error('JWT_SECRET must be configured.')
}

const allowedOrigin = process.env.FRONTEND_URL || true
app.use(cors({ origin: allowedOrigin, credentials: true }))
app.use(express.json())
app.use(cookieParser())

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

const createToken = (user) => jwt.sign({ userId: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' })

const requireAuth = (request, response, next) => {
  const token = request.cookies.auth_token
  if (!token) return response.status(401).json({ message: 'Authentication required.' })

  try {
    request.user = jwt.verify(token, jwtSecret)
    return next()
  } catch {
    return response.status(401).json({ message: 'Your session has expired.' })
  }
}

app.post('/api/auth/register', async (request, response) => {
  const email = String(request.body.email || '').trim().toLowerCase()
  const password = String(request.body.password || '')
  if (!email || password.length < 8) {
    return response.status(400).json({ message: 'Use a valid email and a password of at least 8 characters.' })
  }

  try {
    await schemaReady
    const passwordHash = await bcrypt.hash(password, 12)
    const user = sql
      ? (await sql`
          INSERT INTO users (email, password_hash)
          VALUES (${email}, ${passwordHash})
          RETURNING id, email
        `)[0]
      : (() => {
          const result = database.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, passwordHash)
          return database.prepare('SELECT id, email FROM users WHERE id = ?').get(result.lastInsertRowid)
        })()
    response.cookie('auth_token', createToken(user), authCookieOptions)
    return response.status(201).json(user)
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
      return response.status(409).json({ message: 'An account with this email already exists.' })
    }
    console.error(error)
    return response.status(500).json({ message: 'Unable to create account.' })
  }
})

app.post('/api/auth/login', async (request, response) => {
  const email = String(request.body.email || '').trim().toLowerCase()
  const password = String(request.body.password || '')
  try {
    await schemaReady
    const user = sql
      ? (await sql`SELECT id, email, password_hash FROM users WHERE email = ${email}`)[0]
      : database.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email)
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return response.status(401).json({ message: 'Invalid email or password.' })
    }
    response.cookie('auth_token', createToken(user), authCookieOptions)
    return response.json({ id: user.id, email: user.email })
  } catch (error) {
    console.error(error)
    return response.status(500).json({ message: 'Unable to sign in.' })
  }
})

app.post('/api/auth/logout', (request, response) => {
  response.clearCookie('auth_token', authCookieOptions)
  response.status(204).end()
})

app.get('/api/auth/me', requireAuth, (request, response) => {
  response.json({ id: request.user.userId, email: request.user.email })
})

app.get('/api/students', requireAuth, async (request, response) => {
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

app.post('/api/students', requireAuth, async (request, response) => {
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
