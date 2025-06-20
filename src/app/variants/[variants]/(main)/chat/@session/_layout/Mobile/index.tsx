'use client';

import { Tabs } from 'antd';
import { createStyles } from 'antd-style';
import { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import MobileContentLayout from '@/components/server/MobileNavLayout';

import SessionSearchBar from '../../features/SessionSearchBar';
import TopicListContainer from '../Desktop/TopicListContainer';
import SessionHeader from './SessionHeader';

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
  // Use translation for tab labels
  const { t } = useTranslation('chat');

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
              label: t('tab.historyChat' as any),
            },
            {
              children: children,
              key: 'assistants',
              label: t('tab.assistantList' as any),
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
