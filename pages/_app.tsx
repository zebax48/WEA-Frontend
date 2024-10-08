import '../src/app/styles/globals.css';
import type { AppProps } from 'next/app';
import Layout from '../src/app/components/Layout';

const MyApp = ({ Component, pageProps }: AppProps) => {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
};

export default MyApp;