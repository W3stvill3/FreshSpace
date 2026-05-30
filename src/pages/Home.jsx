export default function Home() {
  return (
    <div style={{ padding: '2rem' }}>
      <section style={{ textAlign: 'center', padding: '4rem 0', background: '#e9ecef', borderRadius: '8px' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Sparkling Clean, Every Time.</h1>
        <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
          On-demand mobile cleaning and laundry services for residences, Airbnbs, and students.
        </p>
        <a href="/booking" style={{ padding: '1rem 2rem', background: '#007bff', color: '#fff', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
          Book a Clean
        </a>
      </section>

      <section style={{ marginTop: '4rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Our Services</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
            <h3>Residential Cleaning</h3>
            <p>One-off or recurring cleans for your home.</p>
          </div>
          <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
            <h3>Laundry & Ironing</h3>
            <p>Wash, dry, fold, and ironed to perfection.</p>
          </div>
          <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
            <h3>Airbnb Turnover</h3>
            <p>Fast turnover cleans for busy hosts.</p>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '4rem', textAlign: 'center' }}>
        <h2>How It Works</h2>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '2rem', marginTop: '2rem' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>1</div>
            <p>Choose your service</p>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>2</div>
            <p>Pick a date & time</p>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>3</div>
            <p>Relax while we clean</p>
          </div>
        </div>
      </section>
    </div>
  );
}
