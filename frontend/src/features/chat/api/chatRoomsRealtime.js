import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getWebSocketUrl } from './websocketApi';

let client = null;
let isConnected = false;
let desiredRoomIds = new Set();
const subscriptions = new Map();
let messageHandler = null;
let errorHandler = null;
let listeners = 0;

const ensureClient = () => {
  if (client) {
    return;
  }

  const url = getWebSocketUrl();

  const webSocketFactory = () => {
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
      return new WebSocket(url);
    }
    return new SockJS(url, null, {
      transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
      withCredentials: true
    });
  };

  client = new Client({
    reconnectDelay: 3000,
    heartbeatIncoming: 30000,
    heartbeatOutgoing: 30000,
    debug: (str) => {
      if (import.meta.env.DEV) {
        console.debug('[chatRoomsRealtime][STOMP]', str);
      }
    },
    webSocketFactory,
    connectHeaders: {
      cookie: document.cookie || ''
    }
  });

  client.onConnect = () => {
    isConnected = true;
    subscribeExistingRooms();
  };

  client.onDisconnect = () => {
    isConnected = false;
    cleanupSubscriptions();
  };

  client.onStompError = (frame) => {
    console.error('[chatRoomsRealtime] STOMP error:', frame.headers['message'], frame.body);
    errorHandler?.(new Error(frame.headers['message'] || frame.body || 'STOMP error'));
  };

  client.onWebSocketError = (event) => {
    console.error('[chatRoomsRealtime] WebSocket error:', event);
    errorHandler?.(event instanceof Error ? event : new Error(event?.message || 'WebSocket error'));
  };

  client.onWebSocketClose = () => {
    isConnected = false;
    cleanupSubscriptions();
  };

  client.activate();
};

const cleanupSubscriptions = () => {
  subscriptions.forEach((subscription) => {
    try {
      subscription.unsubscribe();
    } catch (error) {
      console.warn('[chatRoomsRealtime] unsubscribe failed:', error);
    }
  });
  subscriptions.clear();
};

const subscribeRoom = (roomId) => {
  if (!roomId && roomId !== 0) return;
  const idKey = String(roomId);

  if (subscriptions.has(idKey)) {
    return;
  }

  if (!isConnected || !client) {
    return;
  }

  const destination = `/user/queue/chat/${idKey}`;

  try {
    const subscription = client.subscribe(destination, (frame) => {
      try {
        const payload = JSON.parse(frame.body);
        messageHandler?.(payload);
      } catch (error) {
        console.error('[chatRoomsRealtime] payload parse error:', error);
      }
    });
    subscriptions.set(idKey, subscription);
  } catch (error) {
    console.error('[chatRoomsRealtime] subscribe error:', error);
  }
};

const unsubscribeRoom = (roomId) => {
  const idKey = String(roomId);
  const subscription = subscriptions.get(idKey);
  if (subscription) {
    try {
      subscription.unsubscribe();
    } catch (error) {
      console.warn('[chatRoomsRealtime] unsubscribe error:', error);
    }
    subscriptions.delete(idKey);
  }
};

const subscribeExistingRooms = () => {
  desiredRoomIds.forEach((roomId) => {
    subscribeRoom(roomId);
  });
};

export const startChatRoomsRealtime = (onMessage, onError) => {
  messageHandler = onMessage;
  errorHandler = onError;
  listeners += 1;
  ensureClient();
};

export const stopChatRoomsRealtime = () => {
  listeners = Math.max(0, listeners - 1);
  if (listeners === 0 && client) {
    try {
      client.deactivate();
    } catch (error) {
      console.warn('[chatRoomsRealtime] deactivate error:', error);
    }
    client = null;
    isConnected = false;
    cleanupSubscriptions();
    desiredRoomIds = new Set();
  }
};

export const updateSubscribedRooms = (roomIds) => {
  const normalizedIds = new Set((roomIds || []).map((id) => {
    if (id == null) return null;
    const numeric = Number(id);
    return Number.isNaN(numeric) ? String(id) : String(numeric);
  }).filter((id) => id !== null));

  // Unsubscribe removed rooms
  desiredRoomIds.forEach((existingId) => {
    if (!normalizedIds.has(existingId)) {
      unsubscribeRoom(existingId);
    }
  });

  desiredRoomIds = normalizedIds;

  if (!client || !isConnected) {
    ensureClient();
    return;
  }

  desiredRoomIds.forEach((roomId) => {
    subscribeRoom(roomId);
  });
};


