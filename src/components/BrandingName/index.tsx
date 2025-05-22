import { memo } from 'react';

import { BRANDING_NAME } from '@/const/branding';
import '@/styles/branding.css';

interface BrandingNameProps {
  className?: string;
}

const BrandingName = memo<BrandingNameProps>(({ className }) => {
  return (
    <span className={`branding-name ${className || ''}`} data-branding="true">
      {BRANDING_NAME}
    </span>
  );
});

BrandingName.displayName = 'BrandingName';

export default BrandingName;
