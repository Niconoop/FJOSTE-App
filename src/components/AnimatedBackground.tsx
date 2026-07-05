import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-background">
      {/* Blob 1: Cyber Teal */}
      <motion.div
        className="bg-blob-1 absolute rounded-full"
        style={{
          width: "650px",
          height: "650px",
          top: "-15%",
          left: "-10%",
          willChange: "transform",
        }}
        animate={{ 
          x: [0, 40, -30, 0], 
          y: [0, -60, 30, 0], 
          scale: [1, 1.15, 0.9, 1]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />

      {/* Blob 2: Purple Neon */}
      <motion.div
        className="bg-blob-2 absolute rounded-full"
        style={{
          width: "800px",
          height: "800px",
          top: "30%",
          right: "-15%",
          willChange: "transform",
        }}
        animate={{ 
          x: [0, -50, 40, 0], 
          y: [0, 40, -50, 0], 
          scale: [1, 1.2, 0.85, 1]
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      {/* Blob 3: Royal Blue */}
      <motion.div
        className="bg-blob-3 absolute rounded-full"
        style={{
          width: "550px",
          height: "550px",
          bottom: "-10%",
          left: "25%",
          willChange: "transform",
        }}
        animate={{ 
          x: [0, 60, -40, 0], 
          y: [0, 30, -45, 0], 
          scale: [1.05, 0.9, 1.15, 1.05]
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />

      {/* Dark overlay to balance contrast and readability */}
      <div className="absolute inset-0 bg-transparent dark:bg-black/20" />
    </div>
  );
};

