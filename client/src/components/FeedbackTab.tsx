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
        className="fixed top-1/2 -translate-y-1/2 right-0 z-40"
      >
        <div
          onClick={handleToggle}
          className="bg-green-600 hover:bg-green-700 text-white rounded-l-lg shadow-lg cursor-pointer px-1 py-8 flex flex-col items-center justify-center gap-1 transition-colors min-w-[24px]"
        >
          <MessageCircle className="h-3 w-3" />
          <span className="text-xs font-medium tracking-wider transform -rotate-90 whitespace-nowrap mt-2">
            FEEDBACK
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