import React from 'react';
import FeedbackTab from './FeedbackTab';
import { useAuth } from '../lib/auth';

interface FeedbackWrapperProps {
  children: React.ReactNode;
}

export default function FeedbackWrapper({ children }: FeedbackWrapperProps) {
  const { user } = useAuth();

  return (
    <>
      {children}
      {user && <FeedbackTab user={user} />}
    </>
  );
}