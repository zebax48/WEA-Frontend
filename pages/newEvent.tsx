import React, { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../src/app/styles/NewEvent.module.css';
import { BASE_URL } from '@/app/components/config';

const EventForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventStartDate: '',
    eventEndDate: '',
    address: '',
    organizer: '',
    organizerEmail: '',
    capacity: 0,
    earlyBirdTotalTickets: 0,
    earlyBirdPrice: 0,
    regularTotalTickets: 0,
    visitorPrice: 0,
    lastMinuteTotalTickets: 0,
    lastMinutePrice: 0,
    hasFreeParking: false,
    hasStandardParking: false,
    standardParkingPrice: 0,
    hasVIPParking: false,
    vipParkingPrice: 0,
    requireNames: false,
    rooms: '',
    zelleAccount: '',
    zelleFee: 0,
    zellePercentage: 0,
    cashAppAccount: '',
    cashFee: 0,
    cashPercentage: 0,
    moncashAccount: '',
    moncashFee: 0,
    moncashPercentage: 0,
    natCashAccount: '',
    natCashFee: 0,
    natCashPercentage: 0,
    pseAccount: '',
    pseFee: 0,
    psePercentage: 0,
    creditCardFee: 0,
    creditCardPercentage: 0,
    logo: '',
    status: 1
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = router.query.token as string;
    //console.log(formData)
    try {
      const response = await fetch(`${BASE_URL}/Event`, {   
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Error al crear el evento');
      }

      const result = await response.json();
      //console.log('Evento creado:', result);
      const eventId = result;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile, `${eventId}.jpg`);
        const uploadResponse = await fetch(`https://new-api.worldeventaccess.com/api/Event/${eventId}/UploadLogo`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Error al subir la imagen');
        }

        router.push(`/eventManager?token=${encodeURIComponent(token)}`)
      }
    } catch (error) {
      console.error('Error en la solicitud:', error);
      alert('Hubo un error al crear el evento');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.eventDetailSection}>
      <div className={styles.section}>
        <div className={styles.formGroup}>
          <label htmlFor="name">Event Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="description">Event Description:</label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="eventStartDate">Event Start Date:</label>
          <input
            type="datetime-local"
            id="eventStartDate"
            name="eventStartDate"
            value={formData.eventStartDate}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="eventEndDate">Event End Date:</label>
          <input
            type="datetime-local"
            id="eventEndDate"
            name="eventEndDate"
            value={formData.eventEndDate}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="address">Event Address:</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="organizer">Organizer Name:</label>
          <input
            type="text"
            id="organizer"
            name="organizer"
            value={formData.organizer}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="organizerEmail">Organizer Email:</label>
          <input
            type="email"
            id="organizerEmail"
            name="organizerEmail"
            value={formData.organizerEmail}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="capacity">Event Total Capacity:</label>
          <input
            type="number"
            id="capacity"
            name="capacity"
            value={formData.capacity}
            onChange={handleInputChange}
            onWheel={(e) => e.preventDefault()}
            className={styles.input}
          />

          <label htmlFor="earlyBirdTotalTickets">How Many Early Bird Tickets:</label>
          <input
            type="number"
            id="earlyBirdTotalTickets"
            name="earlyBirdTotalTickets"
            value={formData.earlyBirdTotalTickets}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="earlyBirdPrice">Early Bird Price:</label>
          <input
            type="number"
            id="earlyBirdPrice"
            name="earlyBirdPrice"
            value={formData.earlyBirdPrice}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="regularTotalTickets">How Many Regular Tickets:</label>
          <input
            type="number"
            id="regularTotalTickets"
            name="regularTotalTickets"
            value={formData.regularTotalTickets}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="visitorPrice">Regular Price:</label>
          <input
            type="number"
            id="visitorPrice"
            name="visitorPrice"
            value={formData.visitorPrice}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="lastMinuteTotalTickets">How Many Last Minute Tickets:</label>
          <input
            type="number"
            id="lastMinuteTotalTickets"
            name="lastMinuteTotalTickets"
            value={formData.lastMinuteTotalTickets}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="lastMinutePrice">Last Minute Price:</label>
          <input
            type="number"
            id="lastMinutePrice"
            name="lastMinutePrice"
            value={formData.lastMinutePrice}
            onChange={handleInputChange}
            className={styles.input}
          />

          {/* Checkbox fields */}
          <label>
            <input
              type="checkbox"
              name="hasFreeParking"
              checked={formData.hasFreeParking}
              onChange={handleInputChange}
            />
            &nbsp;Has Free Parking
          </label>

          <label>
            <input
              type="checkbox"
              name="hasStandardParking"
              checked={formData.hasStandardParking}
              onChange={handleInputChange}
            />
            &nbsp;Has Standard Parking
          </label>

          <label htmlFor="standardParkingPrice">Standard Parking Price:</label>
          <input
            type="number"
            id="standardParkingPrice"
            name="standardParkingPrice"
            value={formData.standardParkingPrice}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label>
            <input
              type="checkbox"
              name="hasVIPParking"
              checked={formData.hasVIPParking}
              onChange={handleInputChange}
            />
            &nbsp;Has Valet Parking
          </label>

          <label htmlFor="vipParkingPrice">Valet Parking Price:</label>
          <input
            type="number"
            id="vipParkingPrice"
            name="vipParkingPrice"
            value={formData.vipParkingPrice}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label>
            <input
              type="checkbox"
              name="requireNames"
              checked={formData.requireNames}
              onChange={handleInputChange}
            />
            &nbsp;Require to Enter Names on Registration
          </label>

          <label htmlFor="rooms">Event Rooms (Comma Separated):</label>
          <input
            type="text"
            id="rooms"
            name="rooms"
            value={formData.rooms}
            onChange={handleInputChange}
            className={styles.input}
          />
          {/* Payment Methods */}
          <h3>Payment Methods</h3>

          {/* Zelle */}
          <label htmlFor="zelleAccount">Zelle Account:</label>
          <input
            type="text"
            id="zelleAccount"
            name="zelleAccount"
            value={formData.zelleAccount}
            onChange={handleInputChange}
            className={styles.input}
          />
          <label htmlFor="zelleFee">Zelle Transaction Fee:</label>
          <input
            type="number"
            id="zelleFee"
            name="zelleFee"
            value={formData.zelleFee}
            onChange={handleInputChange}
            className={styles.input}
          />
          <label htmlFor="zellePercentage">Zelle Percentage on Tickets:</label>
          <input
            type="number"
            id="zellePercentage"
            name="zellePercentage"
            value={formData.zellePercentage}
            onChange={handleInputChange}
            className={styles.input}
          />

          {/* Cash App */}
          <label htmlFor="cashAppAccount">Cash App Account:</label>
          <input
            type="text"
            id="cashAppAccount"
            name="cashAppAccount"
            value={formData.cashAppAccount}
            onChange={handleInputChange}
            className={styles.input}
          />
          <label htmlFor="cashFee">Cash App Transaction Fee:</label>
          <input
            type="number"
            id="cashFee"
            name="cashFee"
            value={formData.cashFee}
            onChange={handleInputChange}
            className={styles.input}
          />
          <label htmlFor="cashPercentage">Cash App Percentage on Tickets:</label>
          <input
            type="number"
            id="cashPercentage"
            name="cashPercentage"
            value={formData.cashPercentage}
            onChange={handleInputChange}
            className={styles.input}
          />

          {/* MonCash */}
          <label htmlFor="moncashAccount">MonCash Account:</label>
          <input
            type="text"
            id="moncashAccount"
            name="moncashAccount"
            value={formData.moncashAccount}
            onChange={handleInputChange}
            className={styles.input}
          />
          <label htmlFor="moncashFee">MonCash Transaction Fee:</label>
          <input
            type="number"
            id="moncashFee"
            name="moncashFee"
            value={formData.moncashFee}
            onChange={handleInputChange}
            className={styles.input}
          />
          <label htmlFor="moncashPercentage">MonCash Percentage on Tickets:</label>
          <input
            type="number"
            id="moncashPercentage"
            name="moncashPercentage"
            value={formData.moncashPercentage}
            onChange={handleInputChange}
            className={styles.input}
          />

          {/* NatCash */}
          <label htmlFor="natCashAccount">NatCash Account:</label>
          <input
            type="text"
            id="natCashAccount"
            name="natCashAccount"
            value={formData.natCashAccount}
            onChange={handleInputChange}
            className={styles.input}
          />
          <label htmlFor="natCashFee">NatCash Transaction Fee:</label>
          <input
            type="number"
            id="natCashFee"
            name="natCashFee"
            value={formData.natCashFee}
            onChange={handleInputChange}
            className={styles.input}
          />
          <label htmlFor="natCashPercentage">NatCash Percentage on Tickets:</label>
          <input
            type="number"
            id="natCashPercentage"
            name="natCashPercentage"
            value={formData.natCashPercentage}
            onChange={handleInputChange}
            className={styles.input}
          />

          {/* PSE */}
          <label htmlFor="pseAccount">PSE Account:</label>
          <input
            type="text"
            id="pseAccount"
            name="pseAccount"
            value={formData.pseAccount}
            onChange={handleInputChange}
            className={styles.input}
          />
          <label htmlFor="pseFee">PSE Transaction Fee:</label>
          <input
            type="number"
            id="pseFee"
            name="pseFee"
            value={formData.pseFee}
            onChange={handleInputChange}
            className={styles.input}
          />
          <label htmlFor="psePercentage">PSE Percentage on Tickets:</label>
          <input
            type="number"
            id="psePercentage"
            name="psePercentage"
            value={formData.psePercentage}
            onChange={handleInputChange}
            className={styles.input}
          />

          {/* Credit Card */}
          <label htmlFor="creditCardFee">Credit Card Transaction Fee:</label>
          <input
            type="number"
            id="creditCardFee"
            name="creditCardFee"
            value={formData.creditCardFee}
            onChange={handleInputChange}
            className={styles.input}
          />
          <label htmlFor="creditCardPercentage">Credit Card Percentage on Tickets:</label>
          <input
            type="number"
            id="creditCardPercentage"
            name="creditCardPercentage"
            value={formData.creditCardPercentage}
            onChange={handleInputChange}
            className={styles.input}
          />
          {/* Event Logo */}
          <label htmlFor="logo">Event Logo:</label>
          <input
            type="file"
            id="logo"
            name="logo"
            onChange={(e) => {
              const file = e.target.files ? e.target.files[0] : null;
              setSelectedFile(file);
            }}
            className={styles.input}
          />
        </div>
      </div>

      <button type="submit" className={styles.submitButton}>
        Create Event
      </button>
    </form>
  );
};

export default EventForm;