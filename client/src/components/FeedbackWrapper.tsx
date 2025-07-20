import React from 'react';
import { useQuery } from '@tanstack/react-query';
import FeedbackTab from './FeedbackTab';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/queryClient';

interface FeedbackWrapperProps {
  children: React.ReactNode;
}

export default function FeedbackWrapper({ children }: FeedbackWrapperProps) {
  const { user } = useAuth();
  
  const { data: feedbackSettings } = useQuery<{isEnabled: boolean, disabledMessage: string | null}>({
    queryKey: ['/api/feature-settings/check/feedback-widget'],
    queryFn: () => apiRequest('/api/feature-settings/check/feedback-widget'),
  });

  return (
    <>
      {children}
      {user && feedbackSettings?.isEnabled && <FeedbackTab user={user} />}
    </>
  );
}