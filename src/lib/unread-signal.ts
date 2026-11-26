// Tells the unread badge in the navigation to check again. The navigation stays mounted between
// pages, so it can't rely on the page re-rendering: LiveUpdates signals it when the server says a
// notification arrived, and "Mark all as read" signals it after marking.
export const UNREAD_CHANGED_EVENT = "notifications:changed";

export const signalUnreadChanged = () => window.dispatchEvent(new Event(UNREAD_CHANGED_EVENT));
