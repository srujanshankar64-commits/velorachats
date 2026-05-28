/* eslint-disable */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols

import { Route as rootRoute } from './routes/__root'
import { Route as AuthenticatedImport } from './routes/_authenticated'

const AuthenticatedRoute = AuthenticatedImport.update({
  id: '/_authenticated',
  getParentRoute: () => rootRoute,
} as any)

const AuthenticatedMessagesUserIdRoute = AuthenticatedRoute.update({
  path: '/messages/$userId',
  id: '/messages/$userId',
  getParentRoute: () => AuthenticatedRoute,
} as any)

export const routeTree = rootRoute.addChildren([
  AuthenticatedRoute.addChildren([
    AuthenticatedMessagesUserIdRoute,
  ]),
])
