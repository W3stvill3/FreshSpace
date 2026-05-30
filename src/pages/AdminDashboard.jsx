import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [cleaners, setCleaners] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then(res => res.json()),
      fetch('/api/cleaners').then(res => res.json()),
      fetch('/api/services').then(res => res.json())
    ]).then(([statsData, cleanersData, servicesData]) => {
      setStats(statsData);
      setCleaners(cleanersData);
      setServices(servicesData);
      setLoading(false);
    }).catch(err => console.error(err));
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading dashboard...</div>;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Admin Dashboard</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
          <h3>Total Revenue</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>R{stats.totalRevenue ? stats.totalRevenue.toFixed(2) : '0.00'}</p>
        </div>
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
          <h3>Avg. Order Value</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>R{stats.avgOrderValue ? stats.avgOrderValue.toFixed(2) : '0.00'}</p>
        </div>
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
          <h3>Repeat Rate</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.repeatRate ? stats.repeatRate.toFixed(1) : '0.0'}%</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Bookings per Week</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.bookingsByWeek}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Revenue by Segment</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.revenueBySegment}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ segment, percent }) => `${segment} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {stats.revenueBySegment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <section style={{ marginTop: '4rem' }}>
        <h2>Manage Cleaners</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Name</th>
              <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Email</th>
              <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Skills</th>
              <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Max Dist (km)</th>
            </tr>
          </thead>
          <tbody>
            {cleaners.map(c => (
              <tr key={c.id}>
                <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{c.name}</td>
                <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{c.email}</td>
                <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{c.skills}</td>
                <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{c.max_distance_km}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Manage Services</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Name</th>
              <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Category</th>
              <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {services.map(s => (
              <tr key={s.id}>
                <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{s.name}</td>
                <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{s.category}</td>
                <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>R{s.price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
