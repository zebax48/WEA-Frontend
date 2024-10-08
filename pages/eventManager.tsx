import React, { useEffect, useState } from 'react';
import styles from '../src/app/styles/EventManager.module.css';
import Navbar from '@/app/components/Navbar';
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

    const handleEditEvent = (eventId: string) => {
        router.push(`/editEvent?eventId=${encodeURIComponent(eventId)}&token=${encodeURIComponent(token)}`);
    };

    const handleNewEvent = () => {
        router.push(`/newEvent?token=${encodeURIComponent(token)}`);
    };

    return (
        <div className={styles.cardContainer}>
            <Navbar />
            <div className={styles.eventInfo}>
                <h3>Events | </h3><p> {events.length} total</p>
                <button className={styles.submitButtonInfo} onClick={handleNewEvent}>New Event</button>
            </div>
            
            {events.length > 0 ? (
                events.map((event) => {
                    const totalTicketsSold = event.eventTickets.length;
                    const percentageSold = calculatePercentage(totalTicketsSold, event.capacity);

                    return (
                        <div key={event.id} className={styles.eventCard}>
                            <div className={styles.eventImage}>
                                <img
                                    src={`https://new-api.worldeventaccess.com/api/PublicEventLogo/${event.id}`}
                                    alt={event.name}
                                />
                            </div>
                            <div className={styles.eventDetails}>
                                <h3 className={styles.eventName}>{event.name}</h3>
                                <p className={styles.organizerBold}>Organizer: <span className={styles.date}>{event.organizer}</span></p>
                                <p className={styles.date}>Start date: <span className={styles.dateValue}>{new Date(event.eventStartDate).toLocaleDateString()}</span></p>
                                <p className={styles.percent}>Sold tickets: {totalTicketsSold}/{event.capacity} | {percentageSold.toFixed(2)}% </p>
                            </div>
                            <button className={styles.submitButton} onClick={() => handleEditEvent(event.id)}>Update Event</button>
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