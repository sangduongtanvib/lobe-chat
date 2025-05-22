'use client';

import React, { Suspense, lazy } from 'react';
import { Flexbox } from 'react-layout-kit';

import { SkeletonList } from '../../../(workspace)/@topic/features/SkeletonList';
import SystemRole from '../../../(workspace)/@topic/features/SystemRole';

// Lazy load the TopicListContent component to avoid circular dependencies
const TopicListContent = lazy(() => import('../../../(workspace)/@topic/features/TopicListContent'));

const TopicListContainer = () => {
  return (
    <Flexbox height="100%" style={{ overflow: 'hidden' }}>
      <SystemRole />
      <Suspense fallback={<SkeletonList />}>
        <TopicListContent />
      </Suspense>
    </Flexbox>
  );
};

export default TopicListContainer;
