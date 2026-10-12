import { createBrowserRouter, Navigate } from 'react-router';
import { DismissalApp } from '../features/dismissal/DismissalApp';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate replace to="/guardian" /> },
  { path: '/guardian', element: <DismissalApp role="guardian" /> },
  { path: '/staff', element: <DismissalApp role="staff" /> },
  { path: '*', element: <Navigate replace to="/guardian" /> },
]);
