import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import styles from '../styles/StripePayment.module.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY as string);

interface CheckoutFormProps {
  email: string;
  amount: number;
  onSuccess: () => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ email, amount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setErrorMessage('Card is not valid.');
      return;
    }

    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          email: email,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Error creating payment method.');
        setLoading(false);
        return;
      }

      const response = await fetch('https://new-api.worldeventaccess.com/api/publicTicket/processCardPayment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod?.id,
          amount: amount,
          currency: 'usd',
          email: email,
          description: 'Pago por evento',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Successful payment.');
        onSuccess();
      } else {
        setErrorMessage(`Payment error: ${data.error}`);
      }
    } catch (err) {
      setErrorMessage(`Sorry, a server error has occurred: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.paymentForm} onSubmit={handleSubmit}>
      <div className={styles.cardElement}>
        <CardElement />
      </div>
      <button className={styles.submitButton} type="submit" disabled={!stripe || loading}>
        {loading ? 'Processing payment...' : 'Pay'}
      </button>
      {errorMessage && <div className={styles.error}>{errorMessage}</div>}
      {successMessage && <div className={styles.success}>{successMessage}</div>}
    </form>
  );
};

interface StripePaymentProps {
  email: string;
  totalAmount: number;
  onSuccess: () => void;
}

const StripePayment: React.FC<StripePaymentProps> = ({ email, totalAmount, onSuccess }) => (
  <Elements stripe={stripePromise}>
    <CheckoutForm email={email} amount={totalAmount} onSuccess={onSuccess} />
  </Elements>
);

export default StripePayment;