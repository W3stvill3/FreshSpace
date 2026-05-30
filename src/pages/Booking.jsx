import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function Booking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialServiceId = searchParams.get('serviceId');

  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({
    service_id: initialServiceId || '',
    booking_date: '',
    booking_time: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => setServices(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (formData.booking_date && formData.service_id) {
      setLoadingSlots(true);
      fetch(`/api/available-slots?date=${formData.booking_date}&service_id=${formData.service_id}`)
        .then(res => res.json())
        .then(data => {
          setAvailableSlots(data);
          setLoadingSlots(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingSlots(false);
        });
    }
  }, [formData.booking_date, formData.service_id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        if (data.payfastData) {
          // Construct PayFast form and submit
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = data.payfastUrl;

          for (const key in data.payfastData) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = data.payfastData[key];
            form.appendChild(input);
          }

          document.body.appendChild(form);
          form.submit();
        } else {
          navigate(`/confirmation?bookingId=${data.bookingId}`);
        }
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to book. Please try again.');
    }
  };

  const selectedService = services.find(s => s.id === parseInt(formData.service_id));

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Book Your Service</h1>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ fontWeight: step === 1 ? 'bold' : 'normal', color: step === 1 ? '#007bff' : '#666' }}>1. Service</div>
        <div style={{ fontWeight: step === 2 ? 'bold' : 'normal', color: step === 2 ? '#007bff' : '#666' }}>2. Date & Time</div>
        <div style={{ fontWeight: step === 3 ? 'bold' : 'normal', color: step === 3 ? '#007bff' : '#666' }}>3. Details</div>
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Select Service</label>
            <select name="service_id" value={formData.service_id} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}>
              <option value="">-- Choose a service --</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} (R{s.price})</option>
              ))}
            </select>
            <button type="button" onClick={nextStep} disabled={!formData.service_id} style={{ padding: '0.5rem 1rem', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px' }}>Next</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p><strong>Service:</strong> {selectedService?.name}</p>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Pick Date</label>
            <input type="date" name="booking_date" value={formData.booking_date} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }} />
            
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Pick Time</label>
            <select name="booking_time" value={formData.booking_time} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}>
              <option value="">-- {loadingSlots ? 'Loading slots...' : 'Choose a time'} --</option>
              {availableSlots.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
            {availableSlots.length === 0 && formData.booking_date && !loadingSlots && <p style={{ color: 'red' }}>No slots available for this date.</p>}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" onClick={prevStep} style={{ padding: '0.5rem 1rem' }}>Back</button>
              <button type="button" onClick={nextStep} disabled={!formData.booking_date || !formData.booking_time} style={{ padding: '0.5rem 1rem', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px' }}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p><strong>Service:</strong> {selectedService?.name} on {formData.booking_date} at {formData.booking_time}</p>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name</label>
            <input type="text" name="client_name" value={formData.client_name} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }} />
            
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
            <input type="email" name="client_email" value={formData.client_email} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }} />
            
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Phone</label>
            <input type="tel" name="client_phone" value={formData.client_phone} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }} />
            
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Address</label>
            <textarea name="address" value={formData.address} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }} />
            
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Notes (optional)</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }} />

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" onClick={prevStep} style={{ padding: '0.5rem 1rem' }}>Back</button>
              <button type="submit" style={{ padding: '0.5rem 1rem', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px' }}>Pay with PayFast</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
