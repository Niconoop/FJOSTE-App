import React from 'react';
import { motion } from 'framer-motion';

import homeImage from '../assets/backgrounds/home.webp?inline';
import newsImage from '../assets/backgrounds/news.webp?inline';
import eventsImage from '../assets/backgrounds/events.webp?inline';
import teamImage from '../assets/backgrounds/team.webp?inline';
import galleryImage from '../assets/backgrounds/gallery.webp?inline';
import applyImage from '../assets/backgrounds/apply.webp?inline';

interface AnimatedBackgroundProps {
  activePage?: string;
}

const imageMap: Record<string, string> = {
  dashboard: homeImage,
  news: newsImage,
  events: eventsImage,
  team: teamImage,
  gallery: galleryImage,
  applications: applyImage,
  apply: applyImage,
  profile: applyImage,
};

const layers = [homeImage, newsImage, eventsImage, teamImage, galleryImage, applyImage];

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ activePage }) => {
  const isHidden = activePage === 'map' || activePage === 'profile';
  const activeImage = isHidden ? null : (imageMap[activePage as string] ?? homeImage);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Stacked blurred background layers that crossfade on page change */}
      {layers.map((src, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url('${src}')`,
            filter: 'brightness(0.5) blur(12px) scale(1.05)',
            backgroundColor: '#000',
          }}
          animate={{ opacity: !isHidden && src === activeImage ? 1 : 0 }}
          transition={{ opacity: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }}
        />
      ))}
    </div>
  );
};