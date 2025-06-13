import { Button } from '@lobehub/ui';
import { CollapseProps, Divider } from 'antd';
import isEqual from 'fast-deep-equal';
import { Plus } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useFetchSessions } from '@/hooks/useFetchSessions';
import { useActionSWR } from '@/libs/swr';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import { SessionDefaultGroup } from '@/types/session';

import CollapseGroup from './CollapseGroup';
import Actions from './CollapseGroup/Actions';
import Inbox from './Inbox';
import SessionList from './List';
import ConfigGroupModal from './Modals/ConfigGroupModal';
import RenameGroupModal from './Modals/RenameGroupModal';

const DefaultMode = memo(() => {
  const { t } = useTranslation('chat');
  const mobile = useServerConfigStore((s) => s.isMobile);
  const { showCreateSession } = useServerConfigStore(featureFlagsSelectors);

  const [activeGroupId, setActiveGroupId] = useState<string>();
  const [renameGroupModalOpen, setRenameGroupModalOpen] = useState(false);
  const [configGroupModalOpen, setConfigGroupModalOpen] = useState(false);

  useFetchSessions();

  const createSession = useSessionStore((s) => s.createSession);
  const { mutate: createSessionMutate, isValidating: isCreatingSession } = useActionSWR(
    'session.createSession',
    () => createSession(),
  );

  const defaultSessions = useSessionStore(sessionSelectors.defaultSessions, isEqual);
  const customSessionGroups = useSessionStore(sessionSelectors.customSessionGroups, isEqual);
  const pinnedSessions = useSessionStore(sessionSelectors.pinnedSessions, isEqual);

  const [sessionGroupKeys, updateSystemStatus] = useGlobalStore((s) => [
    systemStatusSelectors.sessionGroupKeys(s),
    s.updateSystemStatus,
  ]);

  const items = useMemo(
    () =>
      [
        pinnedSessions &&
          pinnedSessions.length > 0 && {
            children: <SessionList dataSource={pinnedSessions} />,
            extra: <Actions isPinned openConfigModal={() => setConfigGroupModalOpen(true)} />,
            key: SessionDefaultGroup.Pinned,
            label: t('pin'),
          },
        ...(customSessionGroups || []).map(({ id, name, children }) => ({
          children: <SessionList dataSource={children} groupId={id} />,
          extra: (
            <Actions
              id={id}
              isCustomGroup
              onOpenChange={(isOpen) => {
                if (isOpen) setActiveGroupId(id);
              }}
              openConfigModal={() => setConfigGroupModalOpen(true)}
              openRenameModal={() => setRenameGroupModalOpen(true)}
            />
          ),
          key: id,
          label: name,
        })),
        {
          children: <SessionList dataSource={defaultSessions || []} />,
          extra: <Actions openConfigModal={() => setConfigGroupModalOpen(true)} />,
          key: SessionDefaultGroup.Default,
          label: t('defaultList'),
        },
      ].filter(Boolean) as CollapseProps['items'],
    [t, customSessionGroups, pinnedSessions, defaultSessions],
  );

  return (
    <>
      <Inbox />

      {showCreateSession && (
        <>
          <Flexbox flex={1} padding={mobile ? 16 : 12}>
            <Button
              block
              icon={Plus}
              loading={isCreatingSession}
              onClick={() => createSessionMutate()}
              style={{
                marginBottom: 8,
                marginTop: 8,
              }}
              variant={'filled'}
            >
              {t('newAgent')}
            </Button>
          </Flexbox>
          <Divider style={{ margin: '8px 0' }} />
        </>
      )}

      <CollapseGroup
        activeKey={sessionGroupKeys}
        items={items}
        onChange={(keys) => {
          const expandSessionGroupKeys = typeof keys === 'string' ? [keys] : keys;

          updateSystemStatus({ expandSessionGroupKeys });
        }}
      />
      {activeGroupId && (
        <RenameGroupModal
          id={activeGroupId}
          onCancel={() => setRenameGroupModalOpen(false)}
          open={renameGroupModalOpen}
        />
      )}
      <ConfigGroupModal
        onCancel={() => setConfigGroupModalOpen(false)}
        open={configGroupModalOpen}
      />
    </>
  );
});

DefaultMode.displayName = 'SessionDefaultMode';

export default DefaultMode;
