import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_PREFIX = 'still-reminder-';
const TIMER_ID = 'still-timer-done';
const CHANNEL = 'nudges';

// In the foreground the app already shows its own state, so notifications stay quiet there.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Gentle nudges',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function hasPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return (await Notifications.getPermissionsAsync()).granted;
}

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function cancelWhere(match: (id: string) => boolean) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => match(n.identifier)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Replaces all daily nudges. Times are local HH:MM. */
export async function scheduleReminders(times: string[], hobbyTitle: string | null) {
  if (!(await hasPermission())) return;
  await cancelWhere((id) => id.startsWith(REMINDER_PREFIX));
  await ensureChannel();
  const body = hobbyTitle
    ? `Try ten minutes of ${hobbyTitle.toLowerCase()} instead?`
    : 'Want to do something different for a few minutes?';
  await Promise.all(
    times.map((t) => {
      const [hour, minute] = t.split(':').map(Number);
      return Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${t}`,
        content: { title: 'A little room for yourself', body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
      });
    }),
  );
}

export const cancelReminders = () => (Platform.OS === 'web' ? Promise.resolve() : cancelWhere((id) => id.startsWith(REMINDER_PREFIX)));

/** Tells the user the timer ended even if the app is in the background or closed. */
export async function scheduleTimerDone(at: number, hobbyTitle: string) {
  if (!(await hasPermission())) return;
  await Notifications.cancelScheduledNotificationAsync(TIMER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: TIMER_ID,
    content: { title: 'Time is up', body: `Nice work on ${hobbyTitle.toLowerCase()}. Open STILL to save it.` },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: CHANNEL },
  });
}

export const cancelTimerDone = () =>
  Platform.OS === 'web' ? Promise.resolve() : Notifications.cancelScheduledNotificationAsync(TIMER_ID).catch(() => {});
