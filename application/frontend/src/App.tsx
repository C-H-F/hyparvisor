import './App.css';
import { useSession } from './context/appContext';
import Login from '@/components/login';
import { RouterProvider } from 'react-router-dom';
import { getRouter } from './routes';
import { addErrorCallback } from '@/trpc-client';
import { useToast } from './components/shadcn/ui/use-toast';

let lastError: string | null = null;
function App() {
  window.addEventListener('error', async (errorEvent) => {
    const errStr = errorEvent.error + '';
    if (errStr === lastError) return;
    toast({
      variant: 'destructive',
      title: 'Something went wrong.',
      description: errStr,
      duration: 10000,
    });
    setTimeout(() => {
      lastError = null;
    }, 10000);
    lastError = errStr;
  });
  const { toast } = useToast();
  addErrorCallback((err) => {
    console.warn('Received TRPC error: ', err.message);
  });
  const { sessionToken } = useSession();
  const router = getRouter();
  return <>{!sessionToken ? <Login /> : <RouterProvider router={router} />}</>;
}

export default App;
