import React, { useEffect, useState } from 'react';
import styles from '../src/app/styles/usersTable.module.css';
import Navbar from '@/app/components/Navbar';
import { useRouter } from 'next/router';
import LoadingSpinner from '@/app/components/LoadingSpinner';

const UsersTable: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const router = useRouter();
  const token = router.query.token as string;
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!token) return;

    const fetchUsers = async () => {
      try {
        const response = await fetch('https://new-api.worldeventaccess.com/api/Person', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Error en la solicitud');
        }

        const data = await response.json();
        const activeUsers = data.filter((user: any) => user.personStatus === 1);
        setUsers(activeUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  const getRoleDescription = (roleId: number) => {
    switch (roleId) {
      case 1:
        return 'Admin';
      case 3:
        return 'Supervisor';
      case 5:
        return 'Owner';
      default:
        return '';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.usersContainer}>
      <Navbar />
      <div className={styles.container}>
        <h2 className={styles.h2}>Active Users</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Language</th>
              <th>Country</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user, index) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.firstName}</td>
                  <td>{user.lastName}</td>
                  <td>{user.email}</td>
                  <td>{user.phoneNumber}</td>
                  <td>{user.personStatus === 1 ? 'Active' : 'Inactive'}</td>
                  <td>{user.language?.description}</td>
                  <td>{user.country?.countryName}</td>
                  <td>{getRoleDescription(user.roles[0]?.roleId)}</td>
                  <td className={styles.actions}>
                    <button className={styles.confirmButton}>
                      <img src="/edit-icon.png" alt="Edit" />
                    </button>
                    <button className={styles.confirmButton}>
                      <img src="/delete-icon.png" alt="Delete" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10}>No active users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersTable;