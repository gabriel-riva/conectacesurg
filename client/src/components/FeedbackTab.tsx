import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import FeedbackPanel from './FeedbackPanel';

interface FeedbackTabProps {
  user?: any;
}

export default function FeedbackTab({ user }: FeedbackTabProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleToggle = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  return (
    <>
      {/* Feedback Tab */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: isPanelOpen ? '-384px' : '0' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-1/2 right-0 transform -translate-y-1/2 z-40"
      >
        <div
          onClick={handleToggle}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-l-lg shadow-lg cursor-pointer px-3 py-6 flex items-center space-x-2 transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium transform -rotate-90 whitespace-nowrap">
            Feedback
          </span>
        </div>
      </motion.div>

      {/* Feedback Panel */}
      <FeedbackPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        user={user}
      />

      {/* Overlay */}
      {isPanelOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsPanelOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-20 z-30"
        />
      )}
    </>
  );
}