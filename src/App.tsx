import { BrowserRouter as Router, Routes, Route, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import { Services } from './pages/Services';
import { ServiceDetails } from './pages/ServiceDetails';
import { Finances } from './pages/Finances';
import { Properties } from './pages/Properties';
import { Customers } from './pages/Customers';
import { CustomerDetails } from './pages/CustomerDetails';
import { Invoices } from './pages/Invoices';
import { InvoiceDetails } from './pages/InvoiceDetails';
import { InvoicePDFViewer } from './components/invoices/InvoicePDFViewer';
import { Settings } from './pages/Settings';
import { DevToolsProvider } from './providers/DevToolsProvider';
import { DevPanel } from './components/dev/DevPanel';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import TechniciansList from './pages/Technicians';
import Crews from './pages/Crews';
import { Messages } from './pages/Messages';

// Configure future flags for React Router
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom';
import type { Navigator } from '@remix-run/router';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Estimates } from './pages/Estimates';
import { EstimateForm } from './pages/EstimateForm';
import { EstimatePDFViewer } from './components/estimates/EstimatePDFViewer';

function ErrorBoundaryElement() {
  const error = useRouteError();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[400px] items-center justify-center rounded-lg bg-red-50 p-6 dark:bg-red-900/20"
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-400">
          {isRouteErrorResponse(error) ? 'Page Not Found' : 'Something went wrong'}
        </h2>
        <p className="mb-4 text-sm text-red-600 dark:text-red-300">
          {isRouteErrorResponse(error) 
            ? 'The page you are looking for does not exist.'
            : error instanceof Error 
              ? error.message 
              : 'An unexpected error occurred'}
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.reload()}
          className="inline-flex items-center rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
        >
          <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5" />
          Reload Page
        </motion.button>
      </div>
    </motion.div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundaryElement />,
    children: [
      { index: true, element: <Dashboard />, errorElement: <ErrorBoundaryElement /> },
      { path: 'services', element: <Services />, errorElement: <ErrorBoundaryElement /> },
      { path: 'services/:id', element: <ServiceDetails />, errorElement: <ErrorBoundaryElement /> },
      { path: 'finances', element: <Finances />, errorElement: <ErrorBoundaryElement /> },
      { path: 'properties', element: <Properties />, errorElement: <ErrorBoundaryElement /> },
      { path: 'customers', element: <Customers />, errorElement: <ErrorBoundaryElement /> },
      { path: 'customers/:id', element: <CustomerDetails />, errorElement: <ErrorBoundaryElement /> },
      { path: 'technicians', element: <TechniciansList />, errorElement: <ErrorBoundaryElement /> },
      { path: 'crews', element: <Crews />, errorElement: <ErrorBoundaryElement /> },
      { path: 'estimates', element: <Estimates />, errorElement: <ErrorBoundaryElement /> },
      { path: 'estimates/new', element: <EstimateForm />, errorElement: <ErrorBoundaryElement /> },
      { path: 'estimates/:id', element: <EstimateForm />, errorElement: <ErrorBoundaryElement /> },
      { path: 'estimates/:id/view', element: <EstimatePDFViewer />, errorElement: <ErrorBoundaryElement /> },
      { path: 'invoices', element: <Invoices />, errorElement: <ErrorBoundaryElement /> },
      { path: 'invoices/:id', element: <InvoiceDetails />, errorElement: <ErrorBoundaryElement /> },
      { path: 'invoices/:id/view', element: <InvoicePDFViewer />, errorElement: <ErrorBoundaryElement /> },
      { path: 'messages', element: <Messages />, errorElement: <ErrorBoundaryElement /> },
      { path: 'settings', element: <Settings />, errorElement: <ErrorBoundaryElement /> },
    ],
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      onError: (error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Query Error:', error);
        }
      },
    },
    mutations: {
      onError: (error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Mutation Error:', error);
        }
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DevToolsProvider>
        <RouterProvider router={router} />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'dark:bg-gray-800 dark:text-white',
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
        {process.env.NODE_ENV === 'development' && <DevPanel />}
      </DevToolsProvider>
    </QueryClientProvider>
  );
}

export default App;
