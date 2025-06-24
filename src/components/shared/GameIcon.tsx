import React from 'react';

interface GameIconProps extends React.SVGProps<SVGSVGElement> {
  icon: (string | Record<string, string>)[];
  size?: number | string;
}

export const GameIcon: React.FC<GameIconProps> = ({ icon, size = 24, className, ...props }) => {
  if (!icon || icon.length < 1) {
    return null;
  }

  // The first element is attributes, the rest are path strings.
  const [attrs, ...paths] = icon as [Record<string, string>, ...string[]];

  return (
    <svg
      {...attrs}
      {...props}
      width={size}
      height={size}
      className={className}
      // Using dangerouslySetInnerHTML for SVG paths from the library.
      // This is safe as long as the icon library content is trusted.
      dangerouslySetInnerHTML={{ __html: paths.join('') }}
    />
  );
};
