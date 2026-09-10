// A browser directory handle does not expose the local absolute path required
// by story validation. Use the host's folder dialog; typed paths remain available.
export async function pickStoryFolder({ platform = process.platform, which = Bun.which, spawn = Bun.spawn, env = process.env } = {}) {
  let command;
  if (platform === "darwin") {
    command = ["osascript", "-e", 'POSIX path of (choose folder with prompt "Choose a Splash story folder")'];
  } else if (platform === "win32") {
    command = ["powershell.exe", "-NoProfile", "-STA", "-Command", 'Add-Type -AssemblyName System.Windows.Forms; $picker = New-Object System.Windows.Forms.FolderBrowserDialog; $picker.Description = "Choose a Splash story folder"; if ($picker.ShowDialog() -eq "OK") { Write-Output $picker.SelectedPath }'];
  } else if (which("zenity")) {
    command = ["zenity", "--file-selection", "--directory", "--title=Choose a Splash story folder"];
  } else if (which("kdialog")) {
    command = ["kdialog", "--getexistingdirectory", ".", "--title", "Choose a Splash story folder"];
  } else {
    return { status: "unavailable" };
  }
  const executable = which(command[0]);
  if (!executable) return { status: "unavailable" };
  const childEnv = Object.fromEntries(["PATH", "HOME", "DISPLAY", "WAYLAND_DISPLAY", "XDG_RUNTIME_DIR", "DBUS_SESSION_BUS_ADDRESS", "SYSTEMROOT"].flatMap(name => env[name] ? [[name, env[name]]] : []));
  const child = spawn([executable, ...command.slice(1)], { env: childEnv, stdin: "ignore", stdout: "pipe", stderr: "ignore" });
  const timer = setTimeout(() => child.kill(), 55_000);
  try {
    let output = "";
    const decoder = new TextDecoder();
    for await (const chunk of child.stdout) {
      output += decoder.decode(chunk, { stream: true });
      if (Buffer.byteLength(output) > 16 << 10) { child.kill(); return { status: "unavailable" }; }
    }
    output += decoder.decode();
    const exitCode = await child.exited;
    if (exitCode !== 0 || !output.trim()) return { status: "cancelled" };
    const path = output.replace(/\r?\n$/, "");
    if (/[\r\n\0]/.test(path)) return { status: "unavailable" };
    return { status: "selected", path };
  } catch {
    return { status: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
