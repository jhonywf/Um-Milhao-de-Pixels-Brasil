export type PixelBlockStatus = 'available' | 'reserved' | 'sold' | 'demo';

export type PixelBlock = {
  id: string;
  ownerId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  pixelCount: number;
  artworkData: string | null;
  message: string | null;
  instagram: string | null;
  website: string | null;
  status: PixelBlockStatus;
  createdAt: string | null;
  updatedAt: string | null;
  color: string;
  name: string;
  detail: string;
  initials: string;
};

export type PixelSelection = {
  x: number;
  y: number;
  width: number;
  height: number;
  pixelCount: number;
  free: true;
  status: 'available';
};

export type WallSelection = PixelBlock | PixelSelection;
