'use client';

import { createContext } from 'zustand-utils';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';

import { StoreApiWithSelector } from '@/utils/zustand';

import { Store, store } from './action';

export type { State } from './initialState';

type MiddlewareStore = StateCreator<
  Store,
  [['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  Store
>;

export const createStore = () => {
  const middlewareStore = store as MiddlewareStore;
  return createWithEqualityFn(
    subscribeWithSelector(
      devtools(middlewareStore, {
        name: 'AgentSetting',
      })
    ),
    shallow
  );
};

export const { useStore, useStoreApi, Provider } = createContext<StoreApiWithSelector<Store>>();

export { selectors } from './selectors';
