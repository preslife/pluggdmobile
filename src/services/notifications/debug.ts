export interface NotificationDebugInfo {
  latestCreatedAt: Date;
  latestReadAt: Date | null;
}

export const getNotificationDebugInfo = (
  notifications: Array<{ created_at: string; read_at: string | null }>,
): NotificationDebugInfo | null => {
  if (!notifications.length) return null;

  const latestCreatedAt = notifications.reduce<Date>(
    (latest, notification) => {
      const createdAt = new Date(notification.created_at);
      return createdAt > latest ? createdAt : latest;
    },
    new Date(notifications[0].created_at),
  );

  const latestReadAt = notifications
    .filter((notification) => Boolean(notification.read_at))
    .reduce<Date | null>((latest, notification) => {
      const readAtDate = notification.read_at ? new Date(notification.read_at) : null;
      if (!readAtDate) return latest;
      if (!latest || readAtDate > latest) return readAtDate;
      return latest;
    }, null);

  return { latestCreatedAt, latestReadAt };
};
