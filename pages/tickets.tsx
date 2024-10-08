import { useEffect, useState } from 'react';
import styles from '../src/app/styles/Tickets.module.css';
import { useRouter } from 'next/router';
import Navbar from '@/app/components/Navbar';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import { BASE_URL } from '@/app/components/config';

interface Ticket {
  paymentRecordId?: string;
  paymentType: string;
  totalAmount: number | string;
  zelleName?: string;
  firstName: string;
  lastName: string;
  email: string;
  credentials: string;
  event: {
    name: string;
  };
  ticketStatus: string;
}

const Dashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const token = router.query.token as string;

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchTickets = async () => {
      try {
        const response = await fetch('https://new-api.worldeventaccess.com/api/Ticket?TicketStatus=1&Top=1&Skip=5', {
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
        
        // Filtrar el campo "credentials" y establecer tickets
        const filteredTickets = data.map(({ credentials, ...ticket }: Ticket) => ticket);
        setTickets(filteredTickets); // Solo se guardan los tickets sin "credentials"
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <Navbar />
      <div className={styles.container}>
        <h1>Active Tickets</h1>
        {error && <p>Error: {error}</p>}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Method</th>
              <th>Amount</th>
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
                <td colSpan={10}>No tickets found</td>
              </tr>
            )}
            {tickets.map((ticket) => (
              <tr key={ticket.paymentRecordId || Math.random().toString()}>
                <td>{ticket.paymentRecordId}</td>
                <td>{ticket.paymentType}</td>
                <td>${Number(ticket.totalAmount).toFixed(2)}</td>
                <td>{ticket.firstName}</td>
                <td>{ticket.lastName}</td>
                <td>{ticket.email}</td>
                <td>{ticket.event.name}</td>
                <td>{ticket.ticketStatus === '1' ? 'Active' : 'Inactive'}</td> {/* Corrigido para verificar el estado */}
                <td>
                  <button
                    className={styles.confirmButton}
                  >
                    Editar
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