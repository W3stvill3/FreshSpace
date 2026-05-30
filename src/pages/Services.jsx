import { useState, useEffect } from 'react';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        setServices(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading services...</div>;

  const categories = [...new Set(services.map(s => s.category))];

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Our Services</h1>
      <p>Choose from our wide range of cleaning and laundry services.</p>

      {categories.length === 0 && <p>No services available at the moment.</p>}

      {categories.map(cat => (
        <section key={cat} style={{ marginTop: '2rem' }}>
          <h2 style={{ textTransform: 'capitalize', borderBottom: '2px solid #007bff', display: 'inline-block', paddingBottom: '0.5rem' }}>{cat}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            {services.filter(s => s.category === cat).map(service => (
              <div key={service.id} style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>R{service.price}</span>
                  <a href={`/booking?serviceId=${service.id}`} style={{ padding: '0.5rem 1rem', background: '#28a745', color: '#fff', textDecoration: 'none', borderRadius: '5px' }}>Book</a>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
