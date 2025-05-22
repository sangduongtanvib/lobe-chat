'use client';

import { Tabs } from 'antd';
import { createStyles } from 'antd-style';
import { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import PanelBody from './PanelBody';
import Header from './SessionHeader';
import TopicListContainer from './TopicListContainer';

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

const DesktopLayout = ({ children }: PropsWithChildren) => {
  const { styles } = useStyles();
  const { t } = useTranslation('chat');

  return (
    <>
      <Header />
      <div className={styles.tabsContainer}>
        <Tabs
          defaultActiveKey="topics"
          items={[
            {
              children: <PanelBody><TopicListContainer /></PanelBody>,
              key: 'topics',
              label: t('tab.historyChat' as any),
            },
            {
              children: <PanelBody>{children}</PanelBody>,
              key: 'assistants',
              label: t('tab.assistantList' as any),
            },
          ]}
          size="small"
          tabBarStyle={{ paddingLeft: 12 }}
          tabPosition="top"
        />
      </div>
      {/* ↓ cloud slot ↓ */}

      {/* ↑ cloud slot ↑ */}
    </>
  );
};

export default DesktopLayout;
