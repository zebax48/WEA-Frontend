import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import styles from '../../src/app/styles/EventDetail.module.css';
import StripePayment from '../src/app/components/StripePayment';
import { v4 as uuidv4 } from 'uuid';

interface Event {
  id: string;
  name: string;
  description: string;
  zelleName: string;
  eventStartDate: string;
  organizer: string;
  earlyBirdPrice: number;
  earlyBirdTotalTickets: number;
  visitorPrice: number;
  regularTotalTickets: number;
  lastMinutePrice: number;
  lastMinuteTotalTickets: number;
  hasFreeParking: boolean;
  hasVIPParking: boolean;
  hasStandardParking: boolean;
  standardParkingPrice: number;
  vipParkingPrice: number;
  rooms: string;
  creditCardFee: number;
  zelleFee: number;
  cashFee: number;
  moncashFee: number;
  natCashFee: number;
  pseFee: number;
  soldTickets: number;
}

interface EventDetailProps {
  event: Event;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!;
  const res = await fetch(`http://localhost:5500/api/PublicEvents/${id}`);
  const event: Event = await res.json();

  return { props: { event } };
};

const EventDetail: React.FC<EventDetailProps> = ({ event }) => {
  const formattedDate = new Date(event.eventStartDate).toLocaleDateString();
  const roomOptions = event.rooms.split(',');

  const [guests, setGuests] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);
  const [parkingPrice, setParkingPrice] = useState(0);
  const [transactionFee, setTransactionFee] = useState(0);
  const [coupon, setCoupon] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [pricePerPerson, setPricePerPerson] = useState(event.visitorPrice);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showStripe, setShowStripe] = useState(false);
  const [country, setCountry] = useState('US');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [paymentName, setPaymentName] = useState('');

  const [formValues, setFormValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    groupId: uuidv4(),
    totalAmount: '',
    paymentType: '',
    paymentMethod: '',
  });

  useEffect(() => {
    calculateTotal();
  }, [guests, pricePerPerson, parkingPrice, transactionFee]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCountry(e.target.value);
  };

  const calculateTotal = () => {
    const ticketPrice = (guests + 1) * pricePerPerson;
    const total = ticketPrice + parkingPrice + (ticketPrice * transactionFee / 100);
    setTotalTickets(ticketPrice);
    setTotalPrice(total);
  };

  const handleGuestsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setGuests(value);
  };

  const handleRoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedRoom(e.target.value);
  };

  const checkCoupon = async () => {
    console.log("Coupon:", coupon);
    console.log("Event ID:", event.id);
    console.log("Selected Room:", selectedRoom);
    console.log(new Date(event.eventStartDate).toISOString().split('T')[0]);

    try {
      const res = await fetch('https://api.worldeventaccess.com/api/publicTicket/checkCoupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: coupon,
          eventId: event.id,
          dates: new Date(event.eventStartDate).toISOString().split('T')[0],
          rooms: selectedRoom
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      console.log("API Response:", data);

      if (data === true) {
        alert('Coupon is valid');
      } else {
        alert('Invalid coupon');
      }
    } catch (error) {
      console.error('Error checking coupon:', error);
    }
  };

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const method = e.target.value;
    setPaymentMethod(method);
    if (method === 'creditCard') {
      setTransactionFee(event.creditCardFee);
      setShowStripe(true);
    } else if (method === 'zelle') {
      setTransactionFee(event.zelleFee);
      setShowStripe(false);
    } else if (method === 'cash') {
      setTransactionFee(event.cashFee);
      setShowStripe(false);
    } else if (method === 'moncash') {
      setTransactionFee(event.moncashFee);
      setShowStripe(false);
    } else if (method === 'natCash') {
      setTransactionFee(event.natCashFee);
      setShowStripe(false);
    } else if (method === 'pse') {
      setTransactionFee(event.pseFee);
      setShowStripe(false);
    } else if (method === 'free') {
      setTransactionFee(0);
      setShowStripe(false);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedPrice = e.target.value;
    if (selectedPrice === 'earlyBirdPrice') {
      setPricePerPerson(event.earlyBirdPrice);
    } else if (selectedPrice === 'visitorPrice') {
      setPricePerPerson(event.visitorPrice);
    } else if (selectedPrice === 'lastMinutePrice') {
      setPricePerPerson(event.lastMinutePrice);
    }
  };

  const getPaymentMethods = () => {
    switch (country) {
      case 'US':
        return (
          <>
            <label>
              <input type="radio" name="paymentMethod" value="creditCard" onChange={handlePaymentMethodChange} /> Credit/Debit Card
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="zelle" onChange={handlePaymentMethodChange} /> Zelle
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="cash" onChange={handlePaymentMethodChange} /> CashApp
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="free" onChange={handlePaymentMethodChange} /> Free
            </label>
          </>
        );
      case 'CO':
        return (
          <>
            <label>
              <input type="radio" name="paymentMethod" value="creditCard" onChange={handlePaymentMethodChange} /> Credit/Debit Card
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="pse" onChange={handlePaymentMethodChange} /> PSE
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="free" onChange={handlePaymentMethodChange} /> Free
            </label>
          </>
        );
      case 'HT':
        return (
          <>
            <label>
              <input type="radio" name="paymentMethod" value="creditCard" onChange={handlePaymentMethodChange} /> Credit/Debit Card
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="moncash" onChange={handlePaymentMethodChange} /> MonsCash
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="natCash" onChange={handlePaymentMethodChange} /> NatCash
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="free" onChange={handlePaymentMethodChange} /> Free
            </label>
          </>
        );
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      email: formValues.email,
      eventId: event.id,
      ticketPrice: pricePerPerson,
      groupId: formValues.groupId,
      groupQty: guests + 1,
      groupMain: true,
      totalAmount: totalPrice.toFixed(2),
      status: 1,
      paymentType: paymentMethod,
      paymentMethod: paymentMethod,
      [paymentMethod + 'Account']: paymentAccount,
    };
    console.log("Payload being sent:", JSON.stringify(payload, null, 2));
    try {
      const res = await fetch('https://api.worldeventaccess.com/api/publicTicket/publicTicketBulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([payload])
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      console.log("API Response:", data);
      alert('Registration successful');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <section className={styles.eventDetailSection}>
      <img src={`https://api.worldeventaccess.com/api/PublicEventLogo/${event.id}`} alt={event.name} className={styles.eventImage} />
      <h2 className={styles.eventName}>{event.name}</h2>
      <p className={styles.description}>{event.description}</p>
      <p className={styles.organizer}>
        Organizado por: <span className={styles.organizerBold}>{event.organizer}</span>
      </p>
      <p className={styles.date}>
        Fecha: <span className={styles.dateValue}>{formattedDate}</span>
      </p>

      {/* Registration Form */}
      <form className={styles.registrationForm} onSubmit={handleSubmit}>
        {/* Campos de registro */}
        <div className={styles.formGroup}>
          <label htmlFor="firstName">First Name</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formValues.firstName}
            onChange={(e) => setFormValues({ ...formValues, firstName: e.target.value })}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="lastName">Last Name</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formValues.lastName}
            onChange={(e) => setFormValues({ ...formValues, lastName: e.target.value })}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formValues.email}
            onChange={(e) => setFormValues({ ...formValues, email: e.target.value })}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="phone">Phone</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formValues.phone}
            onChange={(e) => setFormValues({ ...formValues, phone: e.target.value })}
            required
          />
        </div>

        {/* Price per person section */}
        <div className={styles.section}>
          <h3>Price per person:</h3>
          <div className={styles.formGroup}>
            {event.earlyBirdPrice > 0 && event.soldTickets < event.earlyBirdTotalTickets &&(
              <label>
                <input type="radio" name="price" value="earlyBirdPrice" onChange={handlePriceChange} /> Early Bird Price: ${event.earlyBirdPrice}
              </label>
            )}
            {event.visitorPrice > 0 && event.soldTickets >= event.earlyBirdTotalTickets && event.soldTickets < (event.earlyBirdTotalTickets + event.regularTotalTickets) &&(
              <label>
                <input type="radio" name="price" value="visitorPrice" onChange={handlePriceChange} defaultChecked /> Regular Price: ${event.visitorPrice}
              </label>
            )}
            {event.lastMinutePrice > 0 && event.soldTickets >= (event.earlyBirdTotalTickets) &&(
              <label>
                <input type="radio" name="price" value="lastMinutePrice" onChange={handlePriceChange} /> Last Minute Price: ${event.lastMinutePrice}
              </label>
            )}
          </div>
        </div>

        {/* Parking Details section */}
        <div className={styles.section}>
          <h3>Parking Details:</h3>
          <div className={styles.formGroup}>
            {!event.hasFreeParking && !event.hasStandardParking && !event.hasVIPParking && (
              <p>No parking Available</p>
            )}
            {event.hasFreeParking && (
              <label>
                <input type="radio" name="parking" value="freeParking" defaultChecked={event.hasFreeParking} onChange={() => setParkingPrice(0)} /> Free Parking
              </label>)}
            {event.hasStandardParking && (
              <label>
                <input type="radio" name="parking" value="standardParking" onChange={() => setParkingPrice(event.standardParkingPrice)} /> Standard Parking: ${event.standardParkingPrice}
              </label>
            )}
            {event.hasVIPParking && (
              <label>
                <input type="radio" name="parking" value="vipParking" onChange={() => setParkingPrice(event.vipParkingPrice)} /> VIP Parking: ${event.vipParkingPrice}
              </label>
            )}

          </div>
        </div>

        {/* Rooms section */}
        <div className={styles.section}>
          <h3>All Available Rooms:</h3>
          <div className={styles.formGroup}>
            {roomOptions.map((room, index) => (
              <label key={index}>
                <input type="radio" name="room" value={room} onChange={handleRoomChange} checked={room === selectedRoom} /> {room}
              </label>
            ))}
          </div>
        </div>

        {/* Number of Guests */}
        <div className={styles.formGroup}>
          <label htmlFor="guests">How many guests will participate with you (0-12)</label>
          <input
            type="number"
            id="guests"
            name="guests"
            min="0"
            max="12"
            value={guests}
            onChange={handleGuestsChange}
            required
          />
        </div>

        {/* Ticket Details */}
        <div className={styles.section}>
          <h3>Ticket Details:</h3>
          <p>Total Ticket: ${totalTickets}</p>
          <p>Discount: -</p>
          <p>Parking: ${parkingPrice}</p>
          <p>Transaction Fee: {transactionFee}%</p>
          <p>Your total price is: ${totalPrice}</p>
        </div>

        {/* Select de País */}
        <div className={styles.section}>
          <h3>Select Country:</h3>
          <select onChange={handleCountryChange} value={country}>
            <option value="US">United States</option>
            <option value="CO">Colombia</option>
            <option value="HT">Haiti</option>
          </select>
        </div>

        {/* Métodos de pago */}
        <div className={styles.section}>
          <h3>Select Payment Method:</h3>
          <div className={styles.formGroup}>
            {getPaymentMethods()}
          </div>
        </div>

        {/* Mostrar Stripe si se selecciona tarjeta */}
        {showStripe && <StripePayment />}

        {/* Campos adicionales para métodos de pago distintos */}
        {(paymentMethod === 'zelle' || paymentMethod === 'cash' || paymentMethod === 'moncash' || paymentMethod === 'natCash' || paymentMethod === 'pse') && (
          <div className={styles.section}>
            <h3>{paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Account Details:</h3>
            <div className={styles.formGroup}>
              <label htmlFor={`${paymentMethod}Account`}>{paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Account:</label>
              <input
                type="text"
                id={`${paymentMethod}Account`}
                name={`${paymentMethod}Account`}
                value={paymentAccount}
                onChange={(e) => setPaymentAccount(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor={`${paymentMethod}Name`}>{paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Name (Ticket Buyer):</label>
              <input
                type="text"
                id={`${paymentMethod}Name`}
                name={`${paymentMethod}Name`}
                value={paymentName}
                onChange={(e) => setPaymentName(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Verificar cupón */}
        {paymentMethod === 'free' && (
          <div className={styles.section}>
            <h3>Have a Coupon?</h3>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Enter coupon code"
                className={styles.couponInput}
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
              />
              <button type="button" onClick={checkCoupon}>Check Coupon</button>
            </div>
          </div>
        )}

        {/* Botón de submit */}
        <div className={styles.formGroup}>
          <button type="submit" className={styles.submitButton}>Submit</button>
        </div>
      </form>
    </section>
  );
};

export default EventDetail;