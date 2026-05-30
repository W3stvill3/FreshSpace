import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export default function Confirmation() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingId) {
      fetch(`/api/bookings/${bookingId}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setBooking(null);
          } else {
            setBooking(data);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [bookingId]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading confirmation...</div>;
  
  if (!booking) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Booking Not Found</h1>
      <p>Sorry, we couldn't find a booking with that ID.</p>
      <Link to="/">Back to Home</Link>
    </div>
  );

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <div style={{ padding: '2rem', border: '1px solid #28a745', borderRadius: '8px', maxWidth: '600px', margin: '0 auto', background: '#f8fff9' }}>
        <h1 style={{ color: '#28a745' }}>Booking Confirmed!</h1>
        <p>Thank you for choosing FreshSpace. Your booking has been received.</p>
        
        <div style={{ textAlign: 'left', marginTop: '2rem', padding: '1rem', background: '#fff', borderRadius: '5px', border: '1px solid #ddd' }}>
          <p><strong>Booking ID:</strong> #{booking.id}</p>
          <p><strong>Service:</strong> {booking.service_name}</p>
          <p><strong>Date:</strong> {booking.booking_date}</p>
          <p><strong>Time:</strong> {booking.booking_time}</p>
          <p><strong>Address:</strong> {booking.address}</p>
          <p><strong>Status:</strong> <span style={{ textTransform: 'capitalize' }}>{booking.status}</span></p>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Link to="/" style={{ padding: '0.5rem 1rem', background: '#007bff', color: '#fff', textDecoration: 'none', borderRadius: '5px' }}>Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
