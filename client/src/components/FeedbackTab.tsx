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
        className="fixed bottom-32 right-0 z-40"
      >
        <div
          onClick={handleToggle}
          className="bg-green-600 hover:bg-green-700 text-white rounded-l-lg shadow-lg cursor-pointer transition-colors relative"
          style={{ width: '16px', height: '100px' }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold tracking-wider transform -rotate-90 whitespace-nowrap select-none">
              FEEDBACK
            </span>
          </div>
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