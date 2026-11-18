// Tells the unread badge in the navigation to check again. The navigation stays mounted between
// pages and isn't re-rendered by a Server Action on the page, so forms whose actions can create
// notifications (an expense that crosses a budget limit, money that completes a goal) signal it.
export const UNREAD_CHANGED_EVENT = "notifications:changed";

export const signalUnreadChanged = () => window.dispatchEvent(new Event(UNREAD_CHANGED_EVENT));

/** Wraps a useActionState action so a successful result signals the badge. */
export const withUnreadSignal =
  action =>
  async (...args) => {
    const result = await action(...args);
    if (result?.success) signalUnreadChanged();
    return result;
  };
