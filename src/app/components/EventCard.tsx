import { useRouter } from 'next/router';
import { useState } from 'react';
import Image from 'next/image';
import styles from '../styles/EventCard.module.css';

interface Event {
  id: string;
  name: string;
  description: string;
  eventStartDate: string;
  eventEndDate: string;
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

interface EventCardProps {
  event: Event;
  activeTab: string;
}

const EventCard: React.FC<EventCardProps> = ({ event, activeTab }) => {
  const router = useRouter();
  const eventImageUrl = `https://new-api.worldeventaccess.com/api/PublicEventLogo/${event.id}`;
  const formattedDate = new Date(event.eventStartDate).toLocaleDateString();
  const formattedEndDate = new Date(event.eventEndDate).toLocaleDateString();
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);

  const handleRegisterClick = () => {
    router.push(`/events/${event.id}`);
  };

  const parkingDetails = (
    <>
      {event.hasFreeParking && <p className={styles.parkingDetail}>Free Parking</p>}
      {event.hasStandardParking && <p className={styles.parkingDetail}>Standard Parking</p>}
      {event.hasVIPParking && <p className={styles.parkingDetail}>VIP Parking</p>}
    </>
  );

  const isEarlyBirdAvailable = event.earlyBirdTotalTickets > 0 && event.earlyBirdPrice > 0;
  const isRegularPriceAvailable = event.earlyBirdTotalTickets <= 0 && event.regularTotalTickets > 0 && event.visitorPrice > 0;
  const isLastMinutePriceAvailable = event.earlyBirdTotalTickets <= 0 && event.regularTotalTickets <= 0 && event.lastMinutePrice > 0 && event.lastMinuteTotalTickets > 0;

  let price;

  if (isEarlyBirdAvailable) {
    price = event.earlyBirdPrice;
  } else if (isRegularPriceAvailable) {
    price = event.visitorPrice;
  } else if (isLastMinutePriceAvailable) {
    price = event.lastMinutePrice;
  } else {
    price = 0;
  }

  // Verificar si ya se vendieron todos los tickets
  const isSoldOut = (event: Event) => {
    return event.earlyBirdTotalTickets === 0 && event.regularTotalTickets === 0 && event.lastMinuteTotalTickets === 0;
  };

  const discount = isEarlyBirdAvailable && event.visitorPrice > 0
    ? Math.round((1 - event.earlyBirdPrice / event.visitorPrice) * 100)
    : 0;

  let buttonText = price > 0 ? `$${price}` : 'Sold Out';
  let buttonDisabled = false;

  if (activeTab === 'Latest') {
    buttonText = 'Out of Date';
    buttonDisabled = true;
  }

  return (
    <div className={styles.eventCard}>
      <div className={styles.skeletonContainer}>
        {!isImageLoaded && <div className={styles.skeleton}></div>}
        <Image
          src={eventImageUrl}
          alt={event.name}
          className={styles.eventImage}
          width={150}
          height={150}
          onLoad={() => setIsImageLoaded(true)}
        />
      </div>
      <div className={styles.eventDetails}>
        <h2 className={styles.eventName}>{event.name}</h2>
        <div className={styles.descriptionAndParking}>
          <p className={styles.description}>{event.description}</p>
          <div className={styles.parkingDetails}>{parkingDetails}</div>
        </div>
        <p className={styles.organizer}>
          Organizer: <span className={styles.organizerBold}>{event.organizer}</span>
        </p>
        <p className={styles.date}>
          Start date: <span className={styles.dateValue}>{formattedDate}</span>
        </p>
        <p className={styles.date}>
          End date: <span className={styles.dateValue}>&nbsp;{formattedEndDate}</span>
        </p>
      </div>
      <button className={styles.registerButton} onClick={handleRegisterClick} disabled={isSoldOut(event) || buttonDisabled}>
        {buttonText}
        {!buttonDisabled && discount > 0 && (
          <span className={styles.discount}> ({discount}% off)</span>
        )}
      </button>
    </div>
  );
};

export default EventCard;