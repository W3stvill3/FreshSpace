import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// PayFast Sandbox Credentials
const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || '10000100';
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY || '46f0cd694581a';
const PAYFAST_URL = 'https://sandbox.payfast.co.za/eng/process';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// SQLite setup - path via env var so it works in any environment
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'freshspace.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Auto-create tables + seed on first run
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    description TEXT, price REAL NOT NULL, category TEXT NOT NULL,
    add_on_parent_id INTEGER
  );
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL, phone TEXT, address TEXT,
    segment TEXT NOT NULL CHECK (segment IN ('residential','host','student'))
  );
  CREATE TABLE IF NOT EXISTS cleaners (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL, phone TEXT, skills TEXT,
    max_distance_km REAL
  );
  CREATE TABLE IF NOT EXISTS cleaner_availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT, cleaner_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL, start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    FOREIGN KEY (cleaner_id) REFERENCES cleaners(id)
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL,
    cleaner_id INTEGER, service_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','confirmed','completed','cancelled')),
    booking_date TEXT NOT NULL, booking_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL, address TEXT NOT NULL, notes TEXT,
    payment_id TEXT, payment_status TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (cleaner_id) REFERENCES cleaners(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
  );
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL,
    revenue REAL NOT NULL, commission REAL NOT NULL,
    date_recorded TEXT NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
  );
`);

const serviceCount = db.prepare('SELECT COUNT(*) as c FROM services').get();
if (serviceCount.c === 0) {
  const seed = db.transaction(() => {
    db.prepare(`INSERT INTO services (name, description, price, category) VALUES
      ('Standard Clean', 'Full home cleaning service', 35, 'cleaning'),
      ('Deep Clean', 'Thorough deep cleaning of your space', 60, 'cleaning'),
      ('Laundry', 'Wash, dry, fold, and iron', 25, 'laundry'),
      ('Student Clean', 'Quick and affordable student room clean', 20, 'student'),
      ('Linen Change', 'Fresh bed linens and towels', 15, 'add-on')
    `).run();
    db.prepare(`INSERT INTO cleaners (name, email, phone, skills, max_distance_km) VALUES
      ('Alice Cleaner', 'alice@cleaners.com', '987654321', 'cleaning, laundry', 10),
      ('Bob Cleaner', 'bob@cleaners.com', '123456789', 'cleaning, student', 15)
    `).run();
    const ins = db.prepare('INSERT INTO cleaner_availability (cleaner_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)');
    for (let c = 1; c <= 2; c++) {
      for (let d = 1; d <= 5; d++) {
        ins.run(c, d, c === 1 ? '09:00' : '08:00', c === 1 ? '17:00' : '16:00');
      }
    }
  });
  seed();
  console.log('Database seeded with sample data');
}

const addMinutes = (time, mins) => {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m + mins);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// API Routes
app.get('/api/services', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM services').all()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/cleaners', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM cleaners').all()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/available-slots', (req, res) => {
  const { date, service_id } = req.query;
  if (!date) return res.status(400).json({ error: 'Missing date' });
  try {
    const d = new Date(date);
    let dayOfWeek = d.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;

    const availableCleaners = db.prepare(`
      SELECT c.*, ca.start_time, ca.end_time FROM cleaners c
      JOIN cleaner_availability ca ON c.id = ca.cleaner_id
      WHERE ca.day_of_week = ?
    `).all(dayOfWeek);

    const existingBookings = db.prepare(`
      SELECT cleaner_id, booking_time, duration_minutes FROM bookings
      WHERE booking_date = ? AND status != 'cancelled'
    `).all(date);

    const slots = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00"];
    const availableSlots = slots.filter(time =>
      availableCleaners.some(cleaner => {
        if (time < cleaner.start_time || time >= cleaner.end_time) return false;
        return !existingBookings.some(booking => {
          if (booking.cleaner_id !== cleaner.id) return false;
          const bEnd = addMinutes(booking.booking_time, booking.duration_minutes);
          return time >= booking.booking_time && time < bEnd;
        });
      })
    );
    res.json(availableSlots);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/payments/notify', (req, res) => {
  try {
    const { m_payment_id, payment_status } = req.body;
    if (payment_status === 'COMPLETE') {
      db.prepare("UPDATE bookings SET status = 'confirmed', payment_status = 'COMPLETE' WHERE id = ?").run(m_payment_id);
    } else {
      db.prepare('UPDATE bookings SET payment_status = ? WHERE id = ?').run(payment_status, m_payment_id);
    }
    res.sendStatus(200);
  } catch { res.sendStatus(500); }
});

app.post('/api/assign-cleaner', (req, res) => {
  const { booking_id } = req.body;
  if (!booking_id) return res.status(400).json({ error: 'Missing booking_id' });
  try {
    const booking = db.prepare(`
      SELECT b.*, s.category FROM bookings b JOIN services s ON b.service_id = s.id WHERE b.id = ?
    `).get(booking_id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const d = new Date(booking.booking_date);
    let dayOfWeek = d.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;

    const availableCleaners = db.prepare(`
      SELECT c.*, ca.start_time, ca.end_time FROM cleaners c
      JOIN cleaner_availability ca ON c.id = ca.cleaner_id
      WHERE ca.day_of_week = ? AND c.skills LIKE ?
    `).all(dayOfWeek, `%${booking.category}%`);

    const existingBookings = db.prepare(`
      SELECT cleaner_id, booking_time, duration_minutes FROM bookings
      WHERE booking_date = ? AND status != 'cancelled' AND cleaner_id IS NOT NULL
    `).all(booking.booking_date);

    const matchingCleaner = availableCleaners.find(cleaner => {
      const bookingEnd = addMinutes(booking.booking_time, booking.duration_minutes);
      if (booking.booking_time < cleaner.start_time || bookingEnd > cleaner.end_time) return false;
      return !existingBookings.some(eb => {
        if (eb.cleaner_id !== cleaner.id) return false;
        const ebEnd = addMinutes(eb.booking_time, eb.duration_minutes);
        return booking.booking_time < ebEnd && bookingEnd > eb.booking_time;
      });
    });

    if (matchingCleaner) {
      db.prepare('UPDATE bookings SET cleaner_id = ? WHERE id = ?').run(matchingCleaner.id, booking_id);
      res.json({ success: true, cleaner: matchingCleaner });
    } else {
      res.status(404).json({ error: 'No available cleaner found' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/bookings', (req, res) => {
  try {
    const { client_name, client_email, client_phone, address, service_id, booking_date, booking_time, notes } = req.body;
    let client = db.prepare('SELECT id FROM clients WHERE email = ?').get(client_email);
    let client_id;
    if (client) {
      client_id = client.id;
    } else {
      const info = db.prepare("INSERT INTO clients (name, email, phone, address, segment) VALUES (?, ?, ?, ?, 'residential')").run(client_name, client_email, client_phone, address);
      client_id = info.lastInsertRowid;
    }
    const duration = 120;
    const info = db.prepare("INSERT INTO bookings (client_id, service_id, status, booking_date, booking_time, duration_minutes, address, notes) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)").run(client_id, service_id, booking_date, booking_time, duration, address, notes || '');
    const bookingId = info.lastInsertRowid;
    const service = db.prepare('SELECT name, price FROM services WHERE id = ?').get(service_id);

    const payfastData = {
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      return_url: `${BASE_URL}/confirmation?bookingId=${bookingId}`,
      cancel_url: `${BASE_URL}/booking?serviceId=${service_id}`,
      notify_url: `${BASE_URL}/api/payments/notify`,
      name_first: client_name.split(' ')[0],
      name_last: client_name.split(' ').slice(1).join(' ') || 'Customer',
      email_address: client_email,
      m_payment_id: String(bookingId),
      amount: service.price.toFixed(2),
      item_name: `FreshSpace: ${service.name}`
    };
    res.json({ success: true, bookingId: Number(bookingId), payfastData, payfastUrl: PAYFAST_URL });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/bookings/:id', (req, res) => {
  try {
    const booking = db.prepare('SELECT b.*, s.name as service_name FROM bookings b JOIN services s ON b.service_id = s.id WHERE b.id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/stats', (req, res) => {
  try {
    const totalRevenue = db.prepare('SELECT COALESCE(SUM(revenue),0) as total FROM sales').get();
    const bookingsByWeek = db.prepare("SELECT strftime('%W', booking_date) as week, COUNT(*) as count FROM bookings GROUP BY week").all();
    const revenueBySegment = db.prepare("SELECT c.segment, COALESCE(SUM(s.revenue),0) as revenue FROM sales s JOIN bookings b ON s.booking_id = b.id JOIN clients c ON b.client_id = c.id GROUP BY c.segment").all();
    const repeatData = db.prepare("SELECT (SELECT COUNT(*) FROM (SELECT client_id FROM bookings GROUP BY client_id HAVING COUNT(*) > 1)) * 100.0 / MAX(COUNT(DISTINCT client_id),1) as rate FROM bookings").get();
    const avgOrderValue = db.prepare('SELECT COALESCE(AVG(revenue),0) as avg FROM sales').get();

    res.json({
      totalRevenue: totalRevenue.total,
      bookingsByWeek,
      revenueBySegment,
      repeatRate: repeatData?.rate || 0,
      avgOrderValue: avgOrderValue.avg
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Serve frontend in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('/{*path}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FreshSpace running on http://0.0.0.0:${PORT}`);
});