import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
      <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 'bold', textDecoration: 'none', color: '#333' }}>FreshSpace</Link>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#555' }}>Home</Link>
        <Link to="/services" style={{ textDecoration: 'none', color: '#555' }}>Services</Link>
        <Link to="/booking" style={{ textDecoration: 'none', color: '#555' }}>Book Now</Link>
        <Link to="/admin" style={{ textDecoration: 'none', color: '#555' }}>Admin</Link>
      </div>
    </nav>
  );
}
