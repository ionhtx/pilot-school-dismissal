import { createBrowserRouter, Navigate } from 'react-router';
import { DismissalApp } from '../features/dismissal/DismissalApp';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate replace to="/guardian" /> },
  { path: '/guardian', element: <DismissalApp role="guardian" /> },
  { path: '/school', element: <DismissalApp role="school" /> },
  { path: '/staff', element: <Navigate replace to="/school" /> },
  { path: '*', element: <Navigate replace to="/guardian" /> },
]);
