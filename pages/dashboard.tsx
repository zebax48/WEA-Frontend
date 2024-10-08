import React, { useEffect, useState } from 'react';
import styles from '../src/app/styles/Dashboard.module.css';
import Navbar from '@/app/components/Navbar';
import Image from 'next/image';
import { useRouter } from 'next/router';
import LoadingSpinner from '../src/app/components/LoadingSpinner';

const Dashboard: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const token = router.query.token as string;

  useEffect(() => {
    if (!token) return;

    const fetchEvents = async () => {
      try {
        const response = await fetch('https://new-api.worldeventaccess.com/api/Event', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Error en la solicitud');
        }

        const data = await response.json();
        const activeEvents = data.filter((event: any) => event.status === 1);
        setEvents(activeEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [token]);

  const calculatePercentage = (ticketsSold: number, capacity: number) => {
    return Math.min((ticketsSold / capacity) * 100, 100);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.cardContainer}>
      <Navbar />
      {events.length > 0 ? (
        events.map((event) => {
          const totalTicketsSold = event.eventTickets.length;
          const percentageSold = calculatePercentage(totalTicketsSold, event.capacity);

          return (
            <div key={event.id} className={styles.eventCard}>
              <div className={styles.eventImage}>
                <Image
                  src={`https://new-api.worldeventaccess.com/api/PublicEventLogo/${event.id}`}
                  alt={event.name}
                  width={150} // Especifica un ancho
                  height={150} // Especifica una altura
                />
              </div>
              <div className={styles.eventDetails}>
                <h3 className={styles.eventName}>{event.name}</h3>
                <p className={styles.organizerBold}>Organizer: <span className={styles.date}>{event.organizer}</span></p>
                <div className={styles.progressContainer}>
                  <p className={styles.date}>Start date: <span className={styles.dateValue}>{new Date(event.eventStartDate).toLocaleDateString()}</span></p>
                  <p className={styles.percent}>{totalTicketsSold}/{event.capacity} | {percentageSold.toFixed(2)}% </p>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progress} style={{ width: `${percentageSold}%` }}></div>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p>No hay eventos activos.</p>
      )}
    </div>
  );
};

export default Dashboard;