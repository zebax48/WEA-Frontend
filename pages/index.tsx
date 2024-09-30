import { GetServerSideProps } from 'next';
import { useState } from 'react';
import EventCard from '../src/app/components/EventCard';
import styles from '../src/app/styles/Home.module.css';

interface Event {
  id: string;
  name: string;
  description: string;
  eventStartDate: string;
  organizer: string;
  visitorPrice: number;
  regularTotalTickets: number;
  earlyBirdTotalTickets: number;
  earlyBirdPrice: number;
  lastMinutePrice: number;
  lastMinuteTotalTickets: number;
  soldTickets: number;
  hasFreeParking: boolean;
  hasStandardParking: boolean;
  hasVIPParking: boolean;
}

interface HomeProps {
  events: Event[];
}

export const getServerSideProps: GetServerSideProps = async () => {
    const res = await fetch('https://new-api.worldeventaccess.com/api/PublicEvents');
    const events: Event[] = await res.json();
    return { props: { events } };
};

const Home: React.FC<HomeProps> = ({ events }) => {
  const [activeTab, setActiveTab] = useState<string>('All Future Events');

  const today = new Date();

  // Filtrar eventos por categoría
  const filteredEvents = events.filter((event) => {
    const eventDate = new Date(event.eventStartDate);

    if (activeTab === 'Latest') {
      // Mostrar eventos recientes (eventos dentro de los últimos 7 días)
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 15);
      return eventDate >= oneWeekAgo && eventDate <= today;
    } else if (activeTab === 'Next Month') {
      // Mostrar eventos que ocurren el próximo mes
      const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      return eventDate >= nextMonthStart && eventDate <= nextMonthEnd;
    } else if (activeTab === 'All Future Events') {
      // Mostrar todos los eventos futuros
      return eventDate > today;
    }

    return false;
  });

  // Ordenar eventos por fecha
  const sortedEvents = filteredEvents.sort(
    (a, b) => new Date(a.eventStartDate).getTime() - new Date(b.eventStartDate).getTime()
  );

  return (
    <section className={styles.eventsSection}>
      <h1>Upcoming Events</h1>
      <div className={styles.tabs}>
        <button
          className={activeTab === 'All Future Events' ? styles.activeTab : ''}
          onClick={() => setActiveTab('All Future Events')}
        >
          All Future Events
        </button>
        <button
          className={activeTab === 'Latest' ? styles.activeTab : ''}
          onClick={() => setActiveTab('Latest')}
        >
          Latest
        </button>
        <button
          className={activeTab === 'Next Month' ? styles.activeTab : ''}
          onClick={() => setActiveTab('Next Month')}
        >
          Next Month
        </button>
      </div>

      <div className={styles.cardContainer}>
        {sortedEvents.length > 0 ? (
          sortedEvents.map((event) => <EventCard key={event.id} event={event} />)
        ) : (
          <p>No events found for this category.</p>
        )}
      </div>
    </section>
  );
};

export default Home;