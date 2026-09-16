import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Check, ChevronRight, Mail, MapPin, Phone, Plus, Search, Users, X } from 'lucide-react'

const emptyForm = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  course: '',
  year: '1',
  address: '',
}

const formatDate = (value) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(`${value}T00:00:00`))

const initials = (name) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

function App() {
  const [students, setStudents] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await fetch(`/api/students?search=${encodeURIComponent(search)}`)
        if (!response.ok) throw new Error('Could not load students.')
        setStudents(await response.json())
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setIsLoading(false)
      }
    }
    loadStudents()
  }, [search])

  const activeCount = students.length
  const courseCount = useMemo(() => new Set(students.map((student) => student.course)).size, [students])

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const submitForm = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not save student.')
      setStudents([result, ...students])
      setForm(emptyForm)
      setIsFormOpen(false)
      setMessage(`${result.full_name} was added to the directory.`)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="app-shell">
      <div className="page-orbit page-orbit-one" />
      <div className="page-orbit page-orbit-two" />
      <nav className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">SL</span>
          <span>Student Ledger</span>
        </a>
        <div className="topbar-meta"><span className="live-dot" /> Admissions workspace <span className="topbar-divider" /> 2026</div>
      </nav>

      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-line" /> Student records, made clear</div>
        <h1>A better place for<br /><em>student stories.</em></h1>
        <p className="hero-copy">Keep every student detail in one calm, searchable space. Add a new record or browse the directory below.</p>
        <button className="primary-button" onClick={() => { setIsFormOpen(true); setMessage(''); setError('') }}>
          <Plus size={18} strokeWidth={2.5} /> Add student <ArrowUpRight size={17} />
        </button>
      </section>

      <section className="stats-row" aria-label="Directory summary">
        <div className="stat-item"><strong>{activeCount}</strong><span>Students on file</span></div>
        <div className="stat-item"><strong>{courseCount}</strong><span>Courses represented</span></div>
        <div className="stat-item stat-note"><span className="stat-note-mark">↳</span><span>All records are stored<br /> securely in your database</span></div>
      </section>

      <section className="directory-section">
        <div className="section-heading">
          <div><div className="eyebrow small"><span className="eyebrow-line" /> Directory</div><h2>Students</h2></div>
          <div className="search-wrap"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students..." aria-label="Search students" /></div>
        </div>

        {message && <div className="notice success"><Check size={17} /> {message}<button onClick={() => setMessage('')} aria-label="Dismiss message"><X size={16} /></button></div>}
        {error && <div className="notice error"><X size={17} /> {error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}

        <div className="directory-table">
          <div className="table-head"><span>Student</span><span>Course</span><span>Year</span><span>Contact</span><span /></div>
          {isLoading ? <div className="empty-state">Loading your directory...</div> : students.length === 0 ? <div className="empty-state"><Users size={26} /><strong>No students found</strong><span>Add your first student to start the directory.</span></div> : students.map((student) => (
            <button className="student-row" key={student.id} onClick={() => setSelectedStudent(student)}>
              <span className="student-cell"><span className="avatar">{initials(student.full_name)}</span><span><strong>{student.full_name}</strong><small>{student.email}</small></span></span>
              <span className="course-cell">{student.course}</span>
              <span className="year-cell">Year {student.year}</span>
              <span className="contact-cell">{student.phone}</span>
              <ChevronRight className="row-arrow" size={19} />
            </button>
          ))}
        </div>
      </section>

      {isFormOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setIsFormOpen(false)}>
        <form className="modal" onSubmit={submitForm}>
          <div className="modal-heading"><div><div className="eyebrow small"><span className="eyebrow-line" /> New record</div><h2>Add a student</h2></div><button type="button" className="icon-button" onClick={() => setIsFormOpen(false)} aria-label="Close form"><X size={20} /></button></div>
          <div className="form-grid">
            <label className="wide">Full name<input required name="fullName" value={form.fullName} onChange={updateField} placeholder="e.g. Amara Wilson" /></label>
            <label>Email<input required type="email" name="email" value={form.email} onChange={updateField} placeholder="amara@example.com" /></label>
            <label>Phone<input required type="tel" name="phone" value={form.phone} onChange={updateField} placeholder="+1 555 000 0000" /></label>
            <label>Date of birth<input required type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={updateField} /></label>
            <label>Course<input required name="course" value={form.course} onChange={updateField} placeholder="Computer Science" /></label>
            <label>Year<select name="year" value={form.year} onChange={updateField}><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option></select></label>
            <label className="wide">Address<textarea required name="address" value={form.address} onChange={updateField} rows="3" placeholder="Street, city, country" /></label>
          </div>
          <button className="primary-button submit-button" disabled={isSaving}>{isSaving ? 'Saving record...' : <><Check size={18} /> Save student</>}</button>
        </form>
      </div>}

      {selectedStudent && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedStudent(null)}>
        <article className="modal detail-modal">
          <div className="detail-top"><span className="avatar large">{initials(selectedStudent.full_name)}</span><button className="icon-button" onClick={() => setSelectedStudent(null)} aria-label="Close details"><X size={20} /></button></div>
          <div className="eyebrow small"><span className="eyebrow-line" /> Student profile</div><h2>{selectedStudent.full_name}</h2><p className="detail-course">{selectedStudent.course} · Year {selectedStudent.year}</p>
          <div className="detail-list"><div><Mail size={17} /><span>{selectedStudent.email}</span></div><div><Phone size={17} /><span>{selectedStudent.phone}</span></div><div><MapPin size={17} /><span>{selectedStudent.address}</span></div></div>
          <div className="detail-footer">Date of birth <strong>{formatDate(selectedStudent.date_of_birth)}</strong></div>
        </article>
      </div>}
    </main>
  )
}

export default App
