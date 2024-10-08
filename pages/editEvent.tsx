import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../src/app/styles/NewEvent.module.css';
import { BASE_URL } from '@/app/components/config';
import LoadingSpinner from '@/app/components/LoadingSpinner';

const EventForm = () => {
  const router = useRouter();
  const { eventId } = router.query;
  const token = router.query.token as string;
  const [formData, setFormData] = useState({
    id: '',
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
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`https://new-api.worldeventaccess.com/api/Event/${eventId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const eventData = await response.json();

        setFormData({
          ...eventData,
          eventStartDate: eventData.eventStartDate.slice(0, 16),
          eventEndDate: eventData.eventEndDate.slice(0, 16),
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching event:', error);
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = router.query.token as string;

    try {
      const response = await fetch('https://new-api.worldeventaccess.com/api/Event', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el evento');
      }
      window.alert('Event successfully updated');

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
      }
      router.push(`/eventManager?token=${encodeURIComponent(token)}`)
    } catch (error) {
      console.error('Error en la solicitud:', error);
      alert('Hubo un error al actualizar el evento');
    }
  };

  if (loading) {
    return <LoadingSpinner/>;
  }

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
            Has Free Parking
          </label>

          <label>
            <input
              type="checkbox"
              name="hasStandardParking"
              checked={formData.hasStandardParking}
              onChange={handleInputChange}
            />
            Has Standard Parking
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
            Has VIP Parking
          </label>

          <label htmlFor="vipParkingPrice">VIP Parking Price:</label>
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
            Require to Enter Names on Registration
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

          <label htmlFor="zelleAccount">Zelle Account:</label>
          <input
            type="text"
            id="zelleAccount"
            name="zelleAccount"
            value={formData.zelleAccount}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="zelleFee">Zelle Fee:</label>
          <input
            type="number"
            id="zelleFee"
            name="zelleFee"
            value={formData.zelleFee}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="zellePercentage">Zelle Percentage:</label>
          <input
            type="number"
            id="zellePercentage"
            name="zellePercentage"
            value={formData.zellePercentage}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="cashAppAccount">Cash App Account:</label>
          <input
            type="text"
            id="cashAppAccount"
            name="cashAppAccount"
            value={formData.cashAppAccount}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="cashFee">Cash App Fee:</label>
          <input
            type="number"
            id="cashFee"
            name="cashFee"
            value={formData.cashFee}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="cashPercentage">Cash App Percentage:</label>
          <input
            type="number"
            id="cashPercentage"
            name="cashPercentage"
            value={formData.cashPercentage}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="moncashAccount">Moncash Account:</label>
          <input
            type="text"
            id="moncashAccount"
            name="moncashAccount"
            value={formData.moncashAccount}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="moncashFee">Moncash Fee:</label>
          <input
            type="number"
            id="moncashFee"
            name="moncashFee"
            value={formData.moncashFee}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="moncashPercentage">Moncash Percentage:</label>
          <input
            type="number"
            id="moncashPercentage"
            name="moncashPercentage"
            value={formData.moncashPercentage}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="natCashAccount">NatCash Account:</label>
          <input
            type="text"
            id="natCashAccount"
            name="natCashAccount"
            value={formData.natCashAccount}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="natCashFee">NatCash Fee:</label>
          <input
            type="number"
            id="natCashFee"
            name="natCashFee"
            value={formData.natCashFee}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="natCashPercentage">NatCash Percentage:</label>
          <input
            type="number"
            id="natCashPercentage"
            name="natCashPercentage"
            value={formData.natCashPercentage}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="pseAccount">PSE Account:</label>
          <input
            type="text"
            id="pseAccount"
            name="pseAccount"
            value={formData.pseAccount}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="pseFee">PSE Fee:</label>
          <input
            type="number"
            id="pseFee"
            name="pseFee"
            value={formData.pseFee}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="psePercentage">PSE Percentage:</label>
          <input
            type="number"
            id="psePercentage"
            name="psePercentage"
            value={formData.psePercentage}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="creditCardFee">Credit Card Fee:</label>
          <input
            type="number"
            id="creditCardFee"
            name="creditCardFee"
            value={formData.creditCardFee}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="creditCardPercentage">Credit Card Percentage:</label>
          <input
            type="number"
            id="creditCardPercentage"
            name="creditCardPercentage"
            value={formData.creditCardPercentage}
            onChange={handleInputChange}
            className={styles.input}
          />

          <label htmlFor="logo">Event Logo:</label>
          <input
            type="file"
            id="logo"
            name="logo"
            onChange={handleFileChange}
            className={styles.input}
          />

          {/* Submit Button */}
          <button type="submit" className={styles.submitButton}>
            Edit Event
          </button>
        </div>
      </div>
    </form>
  );
};

export default EventForm;