import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { useQueryClient } from '@tanstack/react-query';
import { tokenStore } from '../api/axiosInstance';

/**
 * useTaskSocket — connects to the STOMP WebSocket, updates the React Query
 * cache on task events, and calls onEvent for toast notifications.
 * Uses native WebSocket (no SockJS) for Vite/ESM compatibility.
 *
 * @param {function} onEvent - called with { event, payload } on every WS message
 * @returns {{ connected: boolean }}
 */
export function useTaskSocket(onEvent) {
  const queryClient  = useQueryClient();
  const clientRef    = useRef(null);
  const connectedRef = useRef(false);

  const handleMessage = useCallback((msg) => {
    try {
      const envelope = JSON.parse(msg.body);
      const { event, payload } = envelope;

      switch (event) {
        case 'CREATED':
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['taskStats'] });
          break;
        case 'UPDATED':
        case 'STATUS_CHANGED':
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['taskStats'] });
          queryClient.setQueryData(['task', payload?.id], payload);
          break;
        case 'DELETED':
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['taskStats'] });
          break;
        default:
          break;
      }

      if (onEvent) onEvent(envelope);
    } catch (e) {
      console.error('[WS] Failed to parse message:', e);
    }
  }, [queryClient, onEvent]);

  useEffect(() => {
    const token = tokenStore.getAccess();   // ← fixed: was tokenStore.get()
    if (!token) return;

    const isSecure = window.location.protocol === 'https:';
    const wsProto = isSecure ? 'wss:' : 'ws:';
    const wsHost = window.location.port === '5173' ? 'localhost:8081' : window.location.host;
    const brokerURL = `${wsProto}//${wsHost}/ws/websocket`;

    const client = new Client({
      // Use native WebSocket with /websocket suffix (no SockJS needed)
      brokerURL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      onConnect: () => {
        connectedRef.current = true;
        client.subscribe('/user/queue/tasks', handleMessage);
        console.log('[WS] Connected to /user/queue/tasks');
      },

      onDisconnect: () => {
        connectedRef.current = false;
        console.log('[WS] Disconnected');
      },

      onStompError: (frame) => {
        console.warn('[WS] STOMP error (non-fatal):', frame?.headers?.message);
      },

      onWebSocketError: (e) => {
        console.warn('[WS] WebSocket error (will retry):', e?.type);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { connected: connectedRef.current };
}
