import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  CardElement,
  Elements,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import styles from '../styles/StripePayment.module.css';

// Cargar la clave pública de Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

const CheckoutForm: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmitStripe = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const cardElement = elements.getElement(CardElement);

    // Crear token de Stripe
    const { error, token } = await stripe.createToken(cardElement!);

    if (error) {
      setError(error.message || 'Something went wrong');
      setLoading(false);
      return;
    }

    // Enviar el token al backend para procesar el pago
    console.log('Payment token: ', token);

    setLoading(false);
  };

  return (
    <form className={styles.paymentForm} onSubmit={handleSubmitStripe}>
      <CardElement className={styles.cardElement} />
      {error && <div className={styles.error}>{error}</div>}
      <button className={styles.submitButton} type="submit" disabled={!stripe || loading}>
        {loading ? 'Processing...' : 'Pay'}
      </button>
    </form>
  );
};

const StripePayment: React.FC = () => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
};

export default StripePayment;
