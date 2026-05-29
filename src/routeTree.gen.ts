/* eslint-disable */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols

import { Route as rootRoute } from './routes/__root'
import { Route as AuthImport } from './routes/auth'
import { Route as ContactImport } from './routes/contact'
import { Route as IndexImport } from './routes/index'
import { Route as PrivacyImport } from './routes/privacy'
import { Route as SafetyImport } from './routes/safety'
import { Route as SitemapxmlImport } from './routes/sitemap[.]xml'
import { Route as AuthenticatedImport } from './routes/_authenticated'
import { Route as AuthenticatedRoomsImport } from './routes/_authenticated.rooms'
import { Route as AuthenticatedRandomImport } from './routes/_authenticated.random'
import { Route as AuthenticatedProfileImport } from './routes/_authenticated.profile'
import { Route as AuthenticatedMessagesIndexImport } from './routes/_authenticated.messages.index'
import { Route as AuthenticatedFriendsImport } from './routes/_authenticated.friends'
import { Route as AuthenticatedDiscoverImport } from './routes/_authenticated.discover'
import { Route as AuthenticatedRoomsRoomIdImport } from './routes/_authenticated.rooms.$roomId'
import { Route as AuthenticatedMessagesUserIdImport } from './routes/_authenticated.messages.$userId'

const AuthRoute = AuthImport.update({ path: '/auth', id: '/auth', getParentRoute: () => rootRoute } as any)
const ContactRoute = ContactImport.update({ path: '/contact', id: '/contact', getParentRoute: () => rootRoute } as any)
const IndexRoute = IndexImport.update({ path: '/', id: '/', getParentRoute: () => rootRoute } as any)
const PrivacyRoute = PrivacyImport.update({ path: '/privacy', id: '/privacy', getParentRoute: () => rootRoute } as any)
const SafetyRoute = SafetyImport.update({ path: '/safety', id: '/safety', getParentRoute: () => rootRoute } as any)
const SitemapxmlRoute = SitemapxmlImport.update({ path: '/sitemap[.]xml', id: '/sitemap[.]xml', getParentRoute: () => rootRoute } as any)
const AuthenticatedRoute = AuthenticatedImport.update({ id: '/_authenticated', getParentRoute: () => rootRoute } as any)

const AuthenticatedRoomsRoute = AuthenticatedRoomsImport.update({ path: '/rooms', id: '/rooms', getParentRoute: () => AuthenticatedRoute } as any)
const AuthenticatedRandomRoute = AuthenticatedRandomImport.update({ path: '/random', id: '/random', getParentRoute: () => AuthenticatedRoute } as any)
const AuthenticatedProfileRoute = AuthenticatedProfileImport.update({ path: '/profile', id: '/profile', getParentRoute: () => AuthenticatedRoute } as any)
const AuthenticatedMessagesIndexRoute = AuthenticatedMessagesIndexImport.update({ path: '/messages/', id: '/messages/', getParentRoute: () => AuthenticatedRoute } as any)
const AuthenticatedFriendsRoute = AuthenticatedFriendsImport.update({ path: '/friends', id: '/friends', getParentRoute: () => AuthenticatedRoute } as any)
const AuthenticatedDiscoverRoute = AuthenticatedDiscoverImport.update({ path: '/discover', id: '/discover', getParentRoute: () => AuthenticatedRoute } as any)
const AuthenticatedRoomsRoomIdRoute = AuthenticatedRoomsRoomIdImport.update({ path: '/$roomId', id: '/$roomId', getParentRoute: () => AuthenticatedRoomsRoute } as any)
const AuthenticatedMessagesUserIdRoute = AuthenticatedMessagesUserIdImport.update({ path: '/messages/$userId', id: '/messages/$userId', getParentRoute: () => AuthenticatedRoute } as any)

export const routeTree = rootRoute.addChildren([
  AuthRoute,
  ContactRoute,
  IndexRoute,
  PrivacyRoute,
  SafetyRoute,
  SitemapxmlRoute,
  AuthenticatedRoute.addChildren([
    AuthenticatedDiscoverRoute,
    AuthenticatedFriendsRoute,
    AuthenticatedMessagesIndexRoute,
    AuthenticatedMessagesUserIdRoute,
    AuthenticatedProfileRoute,
    AuthenticatedRandomRoute,
    AuthenticatedRoomsRoute.addChildren([AuthenticatedRoomsRoomIdRoute]),
  ]),
])
