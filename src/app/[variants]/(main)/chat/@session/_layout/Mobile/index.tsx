'use client';

import { PropsWithChildren } from 'react';
import { Tabs } from 'antd';
import { createStyles } from 'antd-style';

import MobileContentLayout from '@/components/server/MobileNavLayout';

import SessionSearchBar from '../../features/SessionSearchBar';
import SessionHeader from './SessionHeader';
import TopicListContainer from '../Desktop/TopicListContainer';

const useStyles = createStyles(({ css }) => ({
  tabsContainer: css`
    display: flex;
    flex-direction: column;
    height: calc(100% - 56px);
    
    .ant-tabs {
      display: flex;
      flex: 1;
      flex-direction: column;
    }
    
    .ant-tabs-content {
      height: 100%;
    }
    
    .ant-tabs-tabpane {
      height: 100%;
    }
  `,
}));

const MobileLayout = ({ children }: PropsWithChildren) => {
  const { styles } = useStyles();
  // Uncomment this when translation is needed
  // const { t } = useTranslation(['chat', 'topic']);

  return (
    <MobileContentLayout header={<SessionHeader />} withNav>
      <div style={{ padding: '8px 16px' }}>
        <SessionSearchBar mobile />
      </div>
      <div className={styles.tabsContainer}>
        <Tabs
          defaultActiveKey="topics"
          items={[
            {
              children: <TopicListContainer />,
              key: 'topics',
              label: 'History',
            },
            {
              children: children,
              key: 'assistants',
              label: 'Assistants',
            },
          ]}
          size="small"
          tabBarStyle={{ paddingLeft: 12 }}
        />
      </div>
      {/* ↓ cloud slot ↓ */}

      {/* ↑ cloud slot ↑ */}
    </MobileContentLayout>
  );
};

export default MobileLayout;