import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { exec } from 'child_process';

const app = express();
const PORT = 3001;

// PayFast Sandbox Credentials
const PAYFAST_MERCHANT_ID = '10000100';
const PAYFAST_MERCHANT_KEY = '46f0cd694581a';
const PAYFAST_URL = 'https://sandbox.payfast.co.za/eng/process';
const BASE_URL = 'http://localhost:5173'; // Assuming Vite dev server

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const query = (sql) => {
  return new Promise((resolve, reject) => {
    const escapedSql = sql.replace(/"/g, '\\"');
    exec(`team-db "${escapedSql}"`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        if (stdout.trim() === '[]' || stdout.trim() === '') {
          resolve([]);
        } else {
          reject(new Error('Failed to parse database output: ' + stdout));
        }
      }
    });
  });
};

const addMinutes = (time, mins) => {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m + mins);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

app.get('/api/available-slots', async (req, res) => {
  const { date, service_id } = req.query;
  if (!date) return res.status(400).json({ error: 'Missing date' });

  try {
    const d = new Date(date);
    let dayOfWeek = d.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;

    const availableCleaners = await query(`
      SELECT c.*, ca.start_time, ca.end_time 
      FROM cleaners c 
      JOIN cleaner_availability ca ON c.id = ca.cleaner_id 
      WHERE ca.day_of_week = ${dayOfWeek}
    `);

    const existingBookings = await query(`
      SELECT cleaner_id, booking_time, duration_minutes 
      FROM bookings 
      WHERE booking_date = '${date}' AND status != 'cancelled'
    `);

    const slots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
    const availableSlots = slots.filter(time => {
      return availableCleaners.some(cleaner => {
        if (time < cleaner.start_time || time >= cleaner.end_time) return false;
        
        const isBooked = existingBookings.some(booking => {
          if (booking.cleaner_id !== cleaner.id) return false;
          const bStart = booking.booking_time;
          const bEnd = addMinutes(bStart, booking.duration_minutes);
          return (time >= bStart && time < bEnd);
        });
        return !isBooked;
      });
    });

    res.json(availableSlots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments/notify', async (req, res) => {
  try {
    const { m_payment_id, payment_status } = req.body;
    if (payment_status === 'COMPLETE') {
      await query(`UPDATE bookings SET status = 'confirmed', payment_status = 'COMPLETE' WHERE id = ${m_payment_id}`);
    } else {
      await query(`UPDATE bookings SET payment_status = '${payment_status}' WHERE id = ${m_payment_id}`);
    }
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});

app.post('/api/assign-cleaner', async (req, res) => {
  const { booking_id } = req.body;
  if (!booking_id) return res.status(400).json({ error: 'Missing booking_id' });

  try {
    const bookings = await query(`
      SELECT b.*, s.category 
      FROM bookings b 
      JOIN services s ON b.service_id = s.id 
      WHERE b.id = ${booking_id}
    `);
    if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = bookings[0];

    const d = new Date(booking.booking_date);
    let dayOfWeek = d.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;

    const availableCleaners = await query(`
      SELECT c.*, ca.start_time, ca.end_time 
      FROM cleaners c 
      JOIN cleaner_availability ca ON c.id = ca.cleaner_id 
      WHERE ca.day_of_week = ${dayOfWeek}
      AND c.skills LIKE '%${booking.category}%'
    `);

    const existingBookings = await query(`
      SELECT cleaner_id, booking_time, duration_minutes 
      FROM bookings 
      WHERE booking_date = '${booking.booking_date}' AND status != 'cancelled' AND cleaner_id IS NOT NULL
    `);

    const matchingCleaner = availableCleaners.find(cleaner => {
      const bookingEnd = addMinutes(booking.booking_time, booking.duration_minutes);
      if (booking.booking_time < cleaner.start_time || bookingEnd > cleaner.end_time) return false;

      const isOverlapping = existingBookings.some(eb => {
        if (eb.cleaner_id !== cleaner.id) return false;
        const ebEnd = addMinutes(eb.booking_time, eb.duration_minutes);
        return (booking.booking_time < ebEnd && bookingEnd > eb.booking_time);
      });
      return !isOverlapping;
    });

    if (matchingCleaner) {
      await query(`UPDATE bookings SET cleaner_id = ${matchingCleaner.id} WHERE id = ${booking_id}`);
      res.json({ success: true, cleaner: matchingCleaner });
    } else {
      res.status(404).json({ error: 'No available cleaner found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ... existing endpoints ...
app.get('/api/services', async (req, res) => {
  try {
    const services = await query('SELECT * FROM services');
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cleaners', async (req, res) => {
  try {
    const cleaners = await query('SELECT * FROM cleaners');
    res.json(cleaners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { client_name, client_email, client_phone, address, service_id, booking_date, booking_time, notes } = req.body;
    let clients = await query(`SELECT id FROM clients WHERE email = '${client_email}'`);
    let client_id;
    if (clients.length > 0) {
      client_id = clients[0].id;
    } else {
      await query(`INSERT INTO clients (name, email, phone, address, segment) VALUES ('${client_name}', '${client_email}', '${client_phone}', '${address}', 'residential')`);
      clients = await query(`SELECT id FROM clients WHERE email = '${client_email}'`);
      client_id = clients[0].id;
    }
    const duration = 120; 
    await query(`INSERT INTO bookings (client_id, service_id, status, booking_date, booking_time, duration_minutes, address, notes) VALUES (${client_id}, ${service_id}, 'pending', '${booking_date}', '${booking_time}', ${duration}, '${address}', '${notes || ''}')`);
    const newBookings = await query(`SELECT id FROM bookings WHERE client_id = ${client_id} ORDER BY id DESC LIMIT 1`);
    const bookingId = newBookings[0].id;

    // Get service details for PayFast
    const serviceDetails = await query(`SELECT name, price FROM services WHERE id = ${service_id}`);
    const service = serviceDetails[0];

    // Prepare PayFast Data
    const payfastData = {
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      return_url: `${BASE_URL}/confirmation?bookingId=${bookingId}`,
      cancel_url: `${BASE_URL}/booking?serviceId=${service_id}`,
      notify_url: `${BASE_URL}/api/payments/notify`, // PayFast ITN webhook
      name_first: client_name.split(' ')[0],
      name_last: client_name.split(' ').slice(1).join(' ') || 'Customer',
      email_address: client_email,
      m_payment_id: bookingId,
      amount: service.price.toFixed(2),
      item_name: `FreshSpace: ${service.name}`
    };

    res.json({ success: true, bookingId, payfastData, payfastUrl: PAYFAST_URL });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await query(`SELECT b.*, s.name as service_name FROM bookings b JOIN services s ON b.service_id = s.id WHERE b.id = ${req.params.id}`);
    if (booking.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard Data API
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalRevenue = await query('SELECT SUM(revenue) as total FROM sales');
    const bookingsByWeek = await query("SELECT strftime('%W', booking_date) as week, COUNT(*) as count FROM bookings GROUP BY week");
    const revenueBySegment = await query("SELECT c.segment, SUM(s.revenue) as revenue FROM sales s JOIN bookings b ON s.booking_id = b.id JOIN clients c ON b.client_id = c.id GROUP BY c.segment");
    const repeatRate = await query("SELECT (SELECT COUNT(*) FROM (SELECT client_id FROM bookings GROUP BY client_id HAVING COUNT(*) > 1)) * 100.0 / COUNT(DISTINCT client_id) as rate FROM bookings");
    const avgOrderValue = await query("SELECT AVG(revenue) as avg FROM sales");
    
    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      bookingsByWeek,
      revenueBySegment,
      repeatRate: repeatRate[0]?.rate || 0,
      avgOrderValue: avgOrderValue[0]?.avg || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/tasks', async (req, res) => {
  try {
    const tasks = await query('SELECT * FROM tasks');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
