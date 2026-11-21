/** Fired once per page load when the boot intro leaves, or right away when it is not shown at all. */
export const BOOT_DONE_EVENT = "fludd:boot-done";

let done = false;

/** Whether the boot intro is already out of the way this page load. Always false on the server. */
export function isBootDone(): boolean {
  return done;
}

/** Announce that the boot intro is out of the way. Safe to call more than once; only the first call fires. */
export function signalBootDone(): void {
  if (done) return;
  done = true;
  window.dispatchEvent(new CustomEvent(BOOT_DONE_EVENT));
}

/**
 * Run `cb` once the boot intro is out of the way: immediately if that already happened this page
 * load, otherwise on the event. Returns an unsubscribe for effect cleanup.
 */
export function onBootDone(cb: () => void): () => void {
  if (done) {
    cb();
    return () => {};
  }
  const handle = () => {
    done = true;
    cb();
  };
  window.addEventListener(BOOT_DONE_EVENT, handle, { once: true });
  return () => window.removeEventListener(BOOT_DONE_EVENT, handle);
}
