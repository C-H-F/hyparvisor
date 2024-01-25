import './App.css';
import { useSession } from './context/appContext';
import Login from '@/components/login';
import { RouterProvider } from 'react-router-dom';
import { getRouter } from './routes';

import { addErrorCallback } from '@/trpc-client';
import { useToast } from './components/shadcn/ui/use-toast';

function App() {
  const { toast } = useToast();
  addErrorCallback((err) => {
    toast({
      variant: 'destructive',
      title: 'Something went wrong.',
      description: err + '',
    });
  });
  const { sessionToken } = useSession();
  const router = getRouter();
  return <>{!sessionToken ? <Login /> : <RouterProvider router={router} />}</>;
}

export default App;
