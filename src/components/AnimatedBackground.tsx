import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-background">
      <motion.div
        className="bg-blob-1 absolute rounded-full"
        style={{
          width: "500px",
          height: "500px",
          top: "-10%",
          left: "-5%",
        }}
        animate={{ x: [0, 30, -20, 0], y: [0, -50, 20, 0], scale: [1, 1.1, 0.9, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="bg-blob-2 absolute rounded-full"
        style={{
          width: "600px",
          height: "600px",
          top: "40%",
          right: "-10%",
        }}
        animate={{ x: [0, -40, 25, 0], y: [0, 30, -40, 0], scale: [1, 1.15, 0.85, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="bg-blob-3 absolute rounded-full"
        style={{
          width: "450px",
          height: "450px",
          bottom: "-5%",
          left: "30%",
        }}
        animate={{ x: [0, 50, -30, 0], y: [0, 20, -30, 0], scale: [1.05, 0.95, 1.1, 1.05] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-transparent dark:bg-black/50" />
    </div>
  );
};

