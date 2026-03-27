import React, { useMemo, useState } from 'react';

type SafeImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  fallbackSrc?: string;
};

const DEFAULT_FALLBACK =
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1600';

export function SafeImage({ src, fallbackSrc, onError, ...rest }: SafeImageProps) {
  const fallback = useMemo(() => fallbackSrc || DEFAULT_FALLBACK, [fallbackSrc]);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  return (
    <img
      {...rest}
      src={currentSrc}
      onError={(e) => {
        if (!failed) {
          setFailed(true);
          setCurrentSrc(fallback);
        }
        onError?.(e);
      }}
    />
  );
}

