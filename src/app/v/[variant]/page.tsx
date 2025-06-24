import { Metadata } from 'next';

import { getCanonicalUrl } from '@/server/utils/url';

/* WAF workaround: This file is in [variant] dynamic route folder */

export const metadata: Metadata = {
  alternates: { canonical: getCanonicalUrl('/') },
};

export { default } from './loading';
