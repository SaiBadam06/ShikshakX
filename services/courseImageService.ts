const COURSE_IMAGE_MAP: Record<string, string> = {
  'machine learning by andrew ng': 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?q=80&w=2070&auto=format&fit=crop',
  'database management systems': 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=2070&auto=format&fit=crop',
  'artificial intelligence foundations': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop',
  'computer networks': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop',
  'introduction to deep learning': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1974&auto=format&fit=crop',
  "google's ml crash course": 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop',
};

const DEFAULT_COURSE_IMAGE = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1974&auto=format&fit=crop';

export const getCourseCoverImage = (title: string, currentImage?: string) => {
  if (currentImage && currentImage.trim() && !currentImage.includes('via.placeholder.com')) {
    return currentImage;
  }

  const normalizedTitle = title.trim().toLowerCase();
  return COURSE_IMAGE_MAP[normalizedTitle] || DEFAULT_COURSE_IMAGE;
};
