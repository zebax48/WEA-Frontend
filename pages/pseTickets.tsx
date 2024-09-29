import { useEffect, useState } from 'react';
import styles from '../src/app/styles/Tickets.module.css';
import { useRouter } from 'next/router';
import Navbar from '@/app/components/Navbar';
import LoadingSpinner from '@/app/components/LoadingSpinner';

interface Ticket {
  paymentRecordId?: string;
  paymentType: string;
  totalAmount: number | string;
  pseName: string;
  pseAccount: string;
  firstName: string;
  lastName: string;
  email: string;
  event: {
    name: string;
  };
  ticketStatus: string;
  groupId: string;
}

const Dashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<boolean>(false);
  const router = useRouter();
  const token = router.query.token as string;

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchTickets = async () => {
      try {
        const response = await fetch('https://new-api.worldeventaccess.com/api/Ticket?TicketStatus=2', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to fetch tickets');
        }
        const data = await response.json();
        const pseTickets = data.filter((ticket: Ticket) => ticket.paymentType === 'pse');
        setTickets(pseTickets);
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error fetching tickets:', error.message);
          setError(error.message);
        } else {
          console.error('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [token, router]);

  const handleConfirm = async (groupId?: string) => {
    if (groupId) {
      const isConfirmed = window.confirm('Are you sure you want to activate this ticket?');
      if (isConfirmed) {
        setConfirming(true);
        try {
          const response = await fetch('https://new-api.worldeventaccess.com/api/Ticket/ConfirmTicketsGroup', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: groupId
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error confirming ticket:', errorText);
            throw new Error(errorText || 'Failed to confirm ticket');
          }
          alert('Ticket has been activated successfully!');

        } catch (error) {
          console.error('Failed to confirm ticket:', error);
        } finally {
          setConfirming(false);
        }
      }
    } else {
      console.log('No groupId available for this ticket');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={confirming ? `${styles.darkBackground} ${styles.container}` : styles.container}>
      <Navbar />
      <div className={styles.container}>
        <h1>PSE Tickets</h1>
        {error && <p>Error: {error}</p>}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Method</th>
              <th>Amount</th>
              <th>PSE Account</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Event</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 && !loading && (
              <tr>
                <td colSpan={9}>No tickets found</td>
              </tr>
            )}
            {tickets.map((ticket) => (
              <tr key={ticket.paymentRecordId || Math.random().toString()}>
                <td>{ticket.paymentRecordId}</td>
                <td>{ticket.paymentType}</td>
                <td>${Number(ticket.totalAmount).toFixed(2)}</td>
                <td>{ticket.pseAccount}</td>
                <td>{ticket.firstName}</td>
                <td>{ticket.lastName}</td>
                <td>{ticket.email}</td>
                <td>{ticket.event.name}</td>
                <td>Inactive</td>
                <td>
                  <button
                    onClick={() => handleConfirm(ticket.groupId)}
                    className={styles.confirmButton}
                  >
                    👍
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;