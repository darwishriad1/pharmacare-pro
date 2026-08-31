import { create } from 'zustand';
import { AppNotification } from '../types';
import { db } from '../database/db';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  refresh: () => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => {
  const sync = () => {
    const notifs = db.getNotifications();
    const unread = notifs.filter((n) => !n.read).length;
    set({ notifications: notifs, unreadCount: unread });
  };

  db.subscribe(sync);

  // Initial sync
  const notifs = db.getNotifications();
  const unread = notifs.filter((n) => !n.read).length;

  return {
    notifications: notifs,
    unreadCount: unread,
    refresh: sync,
    markAsRead: (id: string) => {
      db.markNotificationAsRead(id);
      sync();
    },
    clearAll: () => {
      db.clearAllNotifications();
      sync();
    },
  };
});
