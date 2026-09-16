// Self-managed sessions stay in the launching process so the user's environment
// reaches provider probes without forwarding credentials through a control channel.
export function createLocalSession({ startController, urlField, openUrl = openBrowser }) {
  let active;
  let starting;
  return {
    async start() {
      if (active) return { status: "already-open", [urlField]: active.url };
      starting ??= startController();
      try {
        active = await starting;
        const current = active;
        void current.closed.then(() => { if (active === current) active = null; });
        return { status: "ready", [urlField]: current.url };
      } finally {
        starting = null;
      }
    },
    async openLocally() {
      return active ? openUrl(active.url) : { ok: false, status: "session-expired" };
    },
    close() { active?.close(); },
    wait() { return active?.closed ?? Promise.resolve(); },
  };
}

async function openBrowser(url) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "rundll32.exe" : "xdg-open";
  const executable = Bun.which(command);
  if (!executable) return { ok: false, status: "opener-unavailable" };
  try {
    const args = process.platform === "win32" ? [executable, "url.dll,FileProtocolHandler", url] : [executable, url];
    const env = Object.fromEntries(["PATH", "HOME", "DISPLAY", "WAYLAND_DISPLAY", "XDG_RUNTIME_DIR", "DBUS_SESSION_BUS_ADDRESS", "SYSTEMROOT"].flatMap(name => process.env[name] ? [[name, process.env[name]]] : []));
    const child = Bun.spawn(args, { env, stdin: "ignore", stdout: "ignore", stderr: "ignore" });
    const ok = await child.exited === 0;
    return { ok, status: ok ? "opened" : "opener-failed" };
  } catch {
    return { ok: false, status: "opener-failed" };
  }
}
