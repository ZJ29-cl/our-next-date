import React, { useState, useRef } from 'react';
import {
  Sparkles,
  MapPin,
  Link2,
  ExternalLink,
  X,
  ImagePlus,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LocationData, PlaceCategory } from '../types';
import { sound } from '../lib/sound';
import { prefersReducedMotion } from '../lib/motion';
import { compressImageFile } from '../lib/imageUtils';

interface PlaceSelectorProps {
  location: LocationData;
  onChange: (location: LocationData) => void;
}

interface CategoryOption {
  value: PlaceCategory;
  label: string;
  imageSrc: string;
}

const PRIMARY_CATEGORIES: CategoryOption[] = [
  { value: 'Café', label: 'Café', imageSrc: '/assets/illustrations/cafe_coffee_cup.png' },
  { value: 'Restaurant', label: 'Restaurant', imageSrc: '/assets/illustrations/restaurant_fork_knife.png' },
  { value: 'Bar & Lounge', label: 'Bar & Lounge', imageSrc: '/assets/illustrations/bar_wine_glass.png' },
  { value: 'Park & Outdoor', label: 'Outdoors', imageSrc: '/assets/illustrations/outdoors_tree_bench.png' },
  { value: 'Cinema & Shows', label: 'Cinema', imageSrc: '/assets/illustrations/cinema_film_reel.png' },
  { value: 'Art & Workshop', label: 'Workshop', imageSrc: '/assets/illustrations/craft_paintbrush_vase.png' },
  { value: 'Dessert & Bakery', label: 'Sweet Treats', imageSrc: '/assets/illustrations/sweets_cake.png' },
  { value: 'Game Night', label: 'Game Night', imageSrc: '/assets/illustrations/gamenight_dice.png' },
  { value: 'Live Music', label: 'Live Music', imageSrc: '/assets/illustrations/livemusic_guitar.png' },
  { value: 'Road Trip', label: 'Road Trip', imageSrc: '/assets/illustrations/roadtrip_car.png' },
];

export const PlaceSelector: React.FC<PlaceSelectorProps> = ({
  location,
  onChange,
}) => {
  const [isVenueFocused, setIsVenueFocused] = useState(false);
  const [isLinkFocused, setIsLinkFocused] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(() => Boolean(location.locationLink?.trim()));
  const [isImageSectionOpen, setIsImageSectionOpen] = useState(() =>
    Boolean(location.imageUrls && location.imageUrls.length > 0)
  );
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const imageUrls = location.imageUrls ?? [];

  const isValidUrl = (str?: string): boolean => {
    if (!str || !str.trim()) return false;
    try {
      const url = new URL(str.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const selectedCategories: PlaceCategory[] =
    location.categories ??
    (location.category && location.category !== 'Other' ? [location.category] : []);

  const isSurprise =
    location.category === 'Other' ||
    (selectedCategories.length === 0 && !location.placeName?.trim()) ||
    location.placeName?.trim().toLowerCase().startsWith('surprise');

  const handleToggleSurprise = () => {
    sound.playChipTick();
    if (isSurprise && selectedCategories.length > 0) {
      onChange({
        ...location,
        category: selectedCategories[0] || 'Other',
        categories: selectedCategories,
        placeName: '',
        address: '',
      });
    } else {
      onChange({
        ...location,
        category: 'Other',
        categories: [],
        placeName: 'Surprise me',
        address: 'Surprise me',
      });
    }
  };

  const handleCategoryToggle = (cat: PlaceCategory) => {
    sound.playChipTick();
    const isAlreadySelected = selectedCategories.includes(cat);
    const updatedCategories = isAlreadySelected
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];

    const currentPlace = location.placeName || '';
    const cleanPlace = currentPlace.toLowerCase().startsWith('surprise')
      ? ''
      : currentPlace;

    onChange({
      ...location,
      categories: updatedCategories,
      category: updatedCategories[0] || 'Other',
      placeName: cleanPlace,
      address: cleanPlace,
    });
  };

  const handlePlaceNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange({
      ...location,
      placeName: val,
      address: val,
    });
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange({
      ...location,
      locationLink: val,
    });
  };

  const handleOpenLinkField = () => {
    sound.playPaperRustle();
    setIsLinkOpen(true);
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim() || imageUrls.length >= 3) return;
    sound.playChipTick();
    const updated = [...imageUrls, imageUrlInput.trim()];
    onChange({
      ...location,
      imageUrls: updated,
    });
    setImageUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    sound.playChipTick();
    const updated = imageUrls.filter((_, i) => i !== index);
    onChange({
      ...location,
      imageUrls: updated,
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 3 - imageUrls.length;
    if (remainingSlots <= 0) return;

    setIsUploading(true);
    try {
      const filesToProcess = (Array.from(files) as File[]).slice(0, remainingSlots);
      const compressedUrls = await Promise.all(
        filesToProcess.map((file: File) => compressImageFile(file, 800, 0.75))
      );
      sound.playPaperRustle();
      onChange({
        ...location,
        imageUrls: [...imageUrls, ...compressedUrls],
      });
    } catch (err) {
      console.error('Error compressing image:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const hasValidLink = isValidUrl(location.locationLink);

  return (
    <div id="place-selector-container" className="space-y-3.5">
      {/* Category Chips: Multi-selection with tactile spring physics */}
      <div className="relative">
        <div
          role="region"
          aria-label="Date venue categories"
          tabIndex={0}
          className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none rounded-xl"
        >
          {PRIMARY_CATEGORIES.map((cat) => {
            const isSelected = !isSurprise && selectedCategories.includes(cat.value);
            return (
              <motion.button
                key={cat.value}
                type="button"
                id={`category-chip-${cat.value.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => handleCategoryToggle(cat.value)}
                whileHover={prefersReducedMotion() ? undefined : { scale: 1.03, y: -1 }}
                whileTap={
                  prefersReducedMotion()
                    ? undefined
                    : {
                        scale: 0.94,
                        transition: { type: 'spring', stiffness: 600, damping: 22 },
                      }
                }
                className={`relative min-h-[48px] px-3 sm:px-3.5 py-2 rounded-full text-xs font-medium border flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all select-none focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none ${
                  isSelected
                    ? 'border-[#C67B5C] bg-[#C67B5C] text-white font-semibold shadow-xs'
                    : 'border-[#E8DFD5] bg-white text-[#766B65] hover:text-[#2B2420] hover:border-[#C67B5C]/60 hover:bg-[#FAF6F0]'
                }`}
              >
                <img
                  src={cat.imageSrc}
                  alt=""
                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain relative z-10 shrink-0 select-none pointer-events-none"
                />
                <span className="relative z-10">{cat.label}</span>
              </motion.button>
            );
          })}

          {/* Separate "Surprise Me" Toggle Button */}
          <motion.button
            type="button"
            id="toggle-surprise-me"
            onClick={handleToggleSurprise}
            whileHover={prefersReducedMotion() ? undefined : { scale: 1.03, y: -1 }}
            whileTap={
              prefersReducedMotion()
                ? undefined
                : {
                    scale: 0.94,
                    transition: { type: 'spring', stiffness: 600, damping: 22 },
                  }
            }
            className={`relative min-h-[48px] px-3 sm:px-3.5 py-2 rounded-full text-xs font-medium border flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all select-none focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none ${
              isSurprise
                ? 'border-[#C67B5C] bg-[#C67B5C] text-white font-semibold shadow-xs'
                : 'border-[#E8DFD5] bg-white text-[#766B65] hover:text-[#2B2420] hover:border-[#C67B5C]/60 hover:bg-[#FAF6F0]'
            }`}
          >
            <img
              src="/assets/illustrations/surprise_gift_box.jpg"
              alt=""
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain rounded relative z-10 shrink-0 select-none pointer-events-none mix-blend-multiply"
            />
            <span className="relative z-10">You surprise me</span>
          </motion.button>
        </div>
      </div>

      {/* Venue Name Input */}
      <div className="space-y-2">
        <div
          className={`relative rounded-xl bg-white border transition-colors flex items-center min-h-[48px] px-3.5 ${
            isVenueFocused
              ? 'border-[#C67B5C] ring-2 ring-[#C67B5C]/20'
              : 'border-[#E8DFD5] hover:border-[#C67B5C]/50'
          }`}
        >
          <MapPin className="w-4 h-4 text-[#766B65] mr-2.5 shrink-0" />
          <input
            id="place-name-input"
            type="text"
            aria-label="Specific venue name"
            value={location.placeName || ''}
            onChange={handlePlaceNameChange}
            onFocus={() => setIsVenueFocused(true)}
            onBlur={() => setIsVenueFocused(false)}
            placeholder={
              isSurprise
                ? 'You surprise me (or leave a favorite spot)'
                : 'Have a specific café, table, or park in mind? (optional)'
            }
            className="w-full py-2.5 text-base text-[#2B2420] placeholder-[#766B65]/70 bg-transparent focus:outline-none"
          />
          {location.placeName && (
            <button
              type="button"
              onClick={() => {
                sound.playChipTick();
                onChange({ ...location, placeName: '', address: '' });
              }}
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full text-[#766B65] hover:text-[#2B2420] flex items-center justify-center cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none"
              aria-label="Clear venue"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Secondary Action Row: Link & Visual Photo Strip */}
        <div className="space-y-2 pt-1">
          {/* Visual Photo Strip — adapted from OriginKit & motion.dev spring presets */}
          {(imageUrls.length > 0 || isImageSectionOpen) ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className="flex flex-wrap items-center gap-2.5 py-1"
            >
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="image-file-input"
              />

              {/* Existing photo thumbnails */}
              {imageUrls.map((url, idx) => (
                <motion.div
                  key={idx}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                  className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border border-[#E8DFD5] bg-white shadow-2xs group shrink-0"
                >
                  <img
                    src={url}
                    alt={`Spot photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/illustrations/paper_texture.png';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#2B2420]/80 text-white flex items-center justify-center cursor-pointer hover:bg-red-700 transition-colors shadow-xs"
                    aria-label={`Remove photo ${idx + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}

              {/* Add Photo Tile (if < 3 photos) */}
              {imageUrls.length < 3 && (
                <label
                  htmlFor="image-file-input"
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl border-2 border-dashed border-[#E8DFD5] hover:border-[#C67B5C] bg-white/70 hover:bg-[#FAF6F0] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shrink-0 text-[#766B65] hover:text-[#2B2420]"
                  title="Upload a photo or screenshot"
                >
                  <ImagePlus className="w-4 h-4 text-[#C67B5C]" />
                  <span className="text-[10px] font-medium leading-none">
                    {isUploading ? '...' : '+ Photo'}
                  </span>
                </label>
              )}

              {/* Inline URL paste field */}
              {imageUrls.length < 3 && (
                <div className="flex items-center gap-1 min-h-[44px]">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddImageUrl();
                      }
                    }}
                    placeholder="or paste image link"
                    className="h-9 px-2.5 text-xs text-[#2B2420] placeholder-[#766B65]/60 bg-white/80 rounded-lg border border-[#E8DFD5] focus:border-[#C67B5C] focus:outline-none w-36 sm:w-44"
                  />
                  {imageUrlInput.trim() && (
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="h-9 px-2 bg-[#C67B5C] text-white rounded-lg text-xs font-medium cursor-pointer"
                    >
                      Add
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ) : null}

          {/* Action Row: Discreet Link & Photo buttons */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {/* Progressive Disclosure: Map link field */}
            {!isLinkOpen && !location.locationLink ? (
              <button
                type="button"
                id="btn-add-map-link-toggle"
                onClick={handleOpenLinkField}
                className="text-xs font-medium text-[#766B65] hover:text-[#2B2420] flex items-center gap-1.5 cursor-pointer min-h-[44px] transition-colors py-1 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none rounded-lg"
              >
                <Link2 className="w-3.5 h-3.5 text-[#C67B5C]" />
                <span>+ Add link</span>
              </button>
            ) : null}

            {/* Photo tray toggle (if not already showing) */}
            {!isImageSectionOpen && imageUrls.length === 0 ? (
              <button
                type="button"
                id="btn-add-images-toggle"
                onClick={() => {
                  sound.playPaperRustle();
                  setIsImageSectionOpen(true);
                }}
                className="text-xs font-medium text-[#766B65] hover:text-[#2B2420] flex items-center gap-1.5 cursor-pointer min-h-[44px] transition-colors py-1 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none rounded-lg"
              >
                <ImagePlus className="w-3.5 h-3.5 text-[#C67B5C]" />
                <span>+ Add photo</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Expanded Map Link Input */}
        <AnimatePresence>
          {isLinkOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden pt-1"
            >
              <div
                className={`relative rounded-xl bg-white border transition-colors flex items-center min-h-[48px] px-3.5 ${
                  isLinkFocused
                    ? 'border-[#C67B5C] ring-2 ring-[#C67B5C]/20'
                    : 'border-[#E8DFD5] hover:border-[#C67B5C]/50'
                }`}
              >
                <Link2 className="w-4 h-4 text-[#766B65] mr-2.5 shrink-0" />
                <input
                  id="location-link-input"
                  type="url"
                  aria-label="Map or reservation link"
                  value={location.locationLink || ''}
                  onChange={handleLinkChange}
                  onFocus={() => setIsLinkFocused(true)}
                  onBlur={() => setIsLinkFocused(false)}
                  placeholder="Paste link or Google Maps pin"
                  className="w-full py-2.5 text-base text-[#2B2420] placeholder-[#766B65]/70 bg-transparent focus:outline-none"
                />
                {hasValidLink && (
                  <a
                    href={location.locationLink?.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#A8583A] hover:text-[#2B2420] font-medium mr-2 shrink-0 min-h-[48px] px-1 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none rounded-md"
                    title="Open link in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {location.locationLink ? (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playChipTick();
                      onChange({ ...location, locationLink: '' });
                    }}
                    className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full text-[#766B65] hover:text-[#2B2420] flex items-center justify-center cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none"
                    aria-label="Clear link"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsLinkOpen(false)}
                    className="text-xs text-[#766B65] hover:text-[#2B2420] px-2 py-1 cursor-pointer min-h-[48px] flex items-center focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none rounded-md"
                  >
                    Hide
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
