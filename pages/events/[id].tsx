import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import styles from '../../src/app/styles/EventDetail.module.css';
import StripePayment from '@/app/components/StripePayment';
import { v4 as uuidv4 } from 'uuid';
import { BASE_URL } from '@/app/components/config';

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
  const res = await fetch(`${BASE_URL}/PublicEvents/${id}`);
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
  const [pricePerPerson, setPricePerPerson] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showStripe, setShowStripe] = useState(false);
  const [country, setCountry] = useState('US');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const [isReview, setIsReview] = useState(false);
  const [priceMethod, setPriceMethod] = useState('');
  const [parkingMehod, setParkingMethod] = useState('');
  const [highlightedFields, setHighlightedFields] = useState({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    room: false,
  });

  const [formValues, setFormValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    groupId: uuidv4(),
    totalAmount: '',
    paymentType: '',
    paymentMethod: '',
    payCardNumber: '',
    payCardName: '',
    payZipCode: '',
    payCity: '',
    payCVV: ''
  });

  useEffect(() => {
    calculateTotal();
  }, [guests, pricePerPerson, parkingPrice, transactionFee]);

  useEffect(() => {
    ticketPrice();
  }, [])

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCountry(e.target.value);
  };

  const calculateTotal = () => {
    const ticketPrice = (guests + 1) * pricePerPerson;
    const total = ticketPrice + parkingPrice + ((ticketPrice + parkingPrice) * transactionFee / 100);
    setTotalTickets(ticketPrice);
    setTotalPrice(total);
  };

  const handleGuestsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (value === '') {
      setGuests(0);
      return;
    }

    const parsedValue = parseInt(value, 10);

    if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 12) {
      setGuests(parsedValue);
    } else {
      console.warn("Please enter a number between 0 and 12.");
    }
  };

  const handleRoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedRoom(e.target.value);
  };

  const checkCoupon = async () => {
    try {
      const res = await fetch('https://new-api.worldeventaccess.com/api/publicTicket/checkCoupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: coupon,
          eventId: event.id,
          dates: new Date().toISOString().split('T')[0],
          rooms: selectedRoom
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();
      if (data === true) {
        alert('Coupon is valid');
        handleSubmitPayment();
      } else {
        alert(data.errors.description);
      }
    } catch (error) {
      console.error('Error checking coupon:', error);
    }
  };

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const method = e.target.value;
    setPaymentMethod(method);
    setPaymentAccount('');
    setPaymentName('');
    if (method === 'card') {
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
    } else if (method === 'coupon') {
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

  const ticketPrice = () => {
    if (event.earlyBirdTotalTickets > 0) {
      setPricePerPerson(event.earlyBirdPrice);
      setPriceMethod('early');
    } else if (event.regularTotalTickets > 0) {
      setPricePerPerson(event.visitorPrice);
      setPriceMethod('regular');
    } else if (event.lastMinuteTotalTickets > 0) {
      setPricePerPerson(event.lastMinutePrice);
      setPriceMethod('last');
    }
  }

  const getPaymentMethods = () => {
    switch (country) {
      case 'US':
        return (
          <>
            <label>
              <input type="radio" name="paymentMethod" value="card" checked={paymentMethod === 'card'} onChange={handlePaymentMethodChange} /> Credit/Debit Card
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="zelle" checked={paymentMethod === 'zelle'} onChange={handlePaymentMethodChange} /> Zelle
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === 'cash'} onChange={handlePaymentMethodChange} /> CashApp
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="coupon" checked={paymentMethod === 'coupon'} onChange={handlePaymentMethodChange} /> Coupon
            </label>
          </>
        );
      case 'CO':
        return (
          <>
            <label>
              <input type="radio" name="paymentMethod" value="card" checked={paymentMethod === 'card'} onChange={handlePaymentMethodChange} /> Credit/Debit Card
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="pse" checked={paymentMethod === 'pse'} onChange={handlePaymentMethodChange} /> PSE
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="coupon" checked={paymentMethod === 'coupon'} onChange={handlePaymentMethodChange} /> Coupon
            </label>
          </>
        );
      case 'HT':
        return (
          <>
            <label>
              <input type="radio" name="paymentMethod" value="card" checked={paymentMethod === 'card'} onChange={handlePaymentMethodChange} /> Credit/Debit Card
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="moncash" checked={paymentMethod === 'moncash'} onChange={handlePaymentMethodChange} /> MonsCash
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="natCash" checked={paymentMethod === 'natCash'} onChange={handlePaymentMethodChange} /> NatCash
            </label>
            <label>
              <input type="radio" name="paymentMethod" value="coupon" checked={paymentMethod === 'coupon'} onChange={handlePaymentMethodChange} /> Coupon
            </label>
          </>
        );
      default:
        return null;
    }
  };

  const handleSubmitPayment = async () => {
    const payload = {
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      email: formValues.email,
      eventId: event.id,
      rooms: selectedRoom,
      dates: event.eventStartDate,
      paymentRecordId: coupon,
      paymentMethod: paymentMethod,
      [paymentMethod + 'Account']: paymentAccount,
      [paymentMethod + 'Name']: paymentName,
      groupId: formValues.groupId,
      groupQty: guests + 1,
      priceMethod: priceMethod,
      ticketPrice: pricePerPerson,
      totalAmount: totalPrice.toFixed(2),
      groupMain: true,
      parkingMehod: parkingMehod
    };
    try {
      const res = await fetch('https://new-api.worldeventaccess.com/api/publicTicket/publicTicketBulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([payload])
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      alert('Registration successful');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const areFieldsComplete = () => {
    return formValues.firstName && formValues.lastName && formValues.email && formValues.phone;
  };

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleReview = () => {
    const incompleteFields = {
      firstName: !formValues.firstName,
      lastName: !formValues.lastName,
      email: !validateEmail(formValues.email),
      phone: !formValues.phone,
      room: !selectedRoom,
    };

    setHighlightedFields(incompleteFields);

    if (!Object.values(incompleteFields).includes(true)) {
      setIsReview(!isReview);
    } else {
      alert("Please complete all required fields.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Actualiza el valor del formulario
    setFormValues((prevValues) => ({
      ...prevValues,
      [name]: value,
    }));
    // Quita el resaltado si el campo tiene valor
    if (value) {
      setHighlightedFields((prev) => ({
        ...prev,
        [name]: false,
      }));
    }
  };

  return (
    <section className={styles.eventDetailSection}>
      {/* Mostrar detalles del evento*/}
      {!isReview && (
        <>
          <div className={styles.imageContainer}>
            <img src={`https://new-api.worldeventaccess.com/api/PublicEventLogo/${event.id}`} alt={event.name} className={styles.eventImage} />
          </div>
          <h2 className={styles.eventName}>{event.name}</h2>
          <p className={styles.description}>{event.description}</p>
          <p className={styles.organizer}>
            Organizer: <span className={styles.organizerBold}>{event.organizer}</span>
          </p>
          <p className={styles.date}>
            Event start date: <span className={styles.dateValue}>{formattedDate}</span>
          </p>
        </>
      )}

      {/* Registration Form */}
      <div className={styles.registrationForm}>
        {!isReview ? (
          <>
            {/* Campos de registro */}
            <div className={styles.section}>
              <h3>User details:</h3>
              <div className={styles.formGroup}>
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formValues.firstName}
                  onChange={handleInputChange}
                  className={highlightedFields.firstName ? styles.highlight : ''}
                  required
                />
                {highlightedFields.firstName && <p className={styles.error}>Enter a first name.</p>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formValues.lastName}
                  onChange={handleInputChange}
                  className={highlightedFields.lastName ? styles.highlight : ''}
                  required
                />
                {highlightedFields.lastName && <p className={styles.error}>Enter a last name.</p>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formValues.email}
                  onChange={handleInputChange}
                  className={highlightedFields.email ? styles.highlight : ''}
                  required
                />
                {highlightedFields.email && <p className={styles.error}>Enter a valid email address.</p>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formValues.phone}
                  onChange={handleInputChange}
                  className={highlightedFields.phone ? styles.highlight : ''}
                  required
                />
                {highlightedFields.phone && <p className={styles.error}>Enter a valid phone number.</p>}
              </div>
            </div>

            {/* Price per person section */}
            <div className={styles.section}>
              <h3>Price per person:</h3>
              <div className={styles.formGroup}>
                {event.earlyBirdPrice > 0 && event.earlyBirdTotalTickets > 0 && (
                  <label>
                    <input type="radio" name="price" value="earlyBirdPrice" onChange={handlePriceChange} /> Early Bird Price: ${event.earlyBirdPrice}
                  </label>

                )}
                {event.earlyBirdPrice > 0 && event.earlyBirdTotalTickets > 0 && event.visitorPrice > 0 && (
                  <p className={styles.regularPriceP}>
                    Regular Price: ${event.visitorPrice}
                  </p>

                )}
                {event.visitorPrice > 0 && event.earlyBirdTotalTickets <= 0 && event.regularTotalTickets > 0 && (
                  <label>
                    <input type="radio" name="price" value="visitorPrice" onChange={handlePriceChange} /> Regular Price: ${event.visitorPrice}
                  </label>
                )}
                {event.lastMinutePrice > 0 && event.lastMinuteTotalTickets > 0 && event.earlyBirdTotalTickets <= 0 && event.regularTotalTickets <= 0 && (
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
                    <input type="radio" name="parking" value="free" onChange={() => {
                      setParkingPrice(0);
                      setParkingMethod('free');
                      }} /> Free Parking
                  </label>
                )}
                {event.hasStandardParking && (
                  <label>
                    <input type="radio" name="parking" value="standard" onChange={() => {
                      setParkingPrice(event.standardParkingPrice);
                      setParkingMethod('standard');
                      }} /> Standard Parking: ${event.standardParkingPrice}
                  </label>
                )}
                {event.hasVIPParking && (
                  <label>
                    <input type="radio" name="parking" value="valet" onChange={() => {
                      setParkingPrice(event.vipParkingPrice);
                      setParkingMethod('valet');
                      }}/> VIP Parking: ${event.vipParkingPrice}
                  </label>
                )}
              </div>
            </div>

            {/* Rooms section */}
            <div className={styles.section}>
              <h3>All Available Rooms:</h3> {highlightedFields.room && <p className={styles.error}>Please select a room.</p>}
              <div className={styles.formGroup}>
                {roomOptions.map((room, index) => (
                  <label key={index}>
                    <input
                      type="radio"
                      name="room"
                      value={room}
                      onChange={handleRoomChange}
                      checked={room === selectedRoom}
                    />
                    {room}
                  </label>
                ))}
              </div>
            </div>

            {/* Number of Guests */}
            <div className={styles.section}>
              <div className={styles.formGroup}>
                <label htmlFor="guests">How many guests will participate with you (0-12)</label>
                <input
                  type="number"
                  id="guests"
                  name="guests"
                  min="0"
                  max="12"
                  value={guests > 0 ? guests : ''}
                  onChange={handleGuestsChange}
                  required
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Select Country */}
            <div className={styles.section}>
              <h3>Select Country:</h3>
              <select onChange={handleCountryChange} value={country} className={styles.customSelect}>
                <option value="US">United States</option>
                <option value="CO">Colombia</option>
                <option value="HT">Haiti</option>
              </select>
            </div>

            {/* Ticket Details */}
            <div className={styles.section}>
              <h3>Ticket Details:</h3>
              <p>Total Ticket: ${totalTickets.toFixed(2)}</p>
              <p>Discount: -</p>
              <p>Parking: ${parkingPrice.toFixed(2)}</p>
              <p>Transaction Fee: {transactionFee ? transactionFee.toFixed(2) : '0.00'}%</p>
              <p>Your total price is: <span className={styles.totalTicketPrice}>${totalPrice.toFixed(2)}</span></p>
            </div>

            {/* Payment Method */}
            <div className={styles.section}>
              {areFieldsComplete() ? (
                <>
                  <h3>Select Payment Method:</h3>
                  <div className={styles.formGroup}>
                    {getPaymentMethods()}
                  </div>
                </>
              ) : (
                <h3>Please fill in your details to select a payment method.</h3>
              )}
            </div>
            {/*Mostrar o ocultar Stripe*/}
            
            {showStripe && isReview && <StripePayment email={formValues.email} totalAmount={Number(totalPrice.toFixed(2))} onSuccess={handleSubmitPayment} />}

            {/* Verificar cupón */}
            {paymentMethod === 'coupon' && (
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
                  <button type="button" onClick={checkCoupon} className={styles.submitButton}>Check Coupon</button>
                </div>
              </div>
            )}
            {/* Métodos de pago distintos */}
            {(paymentMethod === 'cash' || paymentMethod === 'zelle' || paymentMethod === 'moncash' || paymentMethod === 'natCash' || paymentMethod === 'pse') && (
              <div className={styles.section}>
                <h3>{paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Account Details:</h3>
                <div className={styles.formGroup}>
                  <label htmlFor={`${paymentMethod}Account`}>{paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Account:</label>
                  <input
                    type="text"
                    id={`${paymentMethod}Account`}
                    name={`${paymentMethod}Account`}
                    value={paymentAccount}
                    onChange={(e) => {
                      setPaymentAccount(e.target.value);
                      setPaymentMethod(parkingMehod);
                    }}
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
          </>
        )}

        {/* Review - Previous Button */}
        <div className={styles.sectionButton}>
          <button
            type="button"
            onClick={handleReview}
            className={`${styles.submitButton} ${isReview ? styles.previousButton : ''}`}
          >
            {isReview ? "Previous" : "Review"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default EventDetail;