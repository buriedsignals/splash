// The installer's configurator entry point — it now DELEGATES to the branded setup page in
// install/preflight/. The path is kept because it is published: install/bootstrap.{sh,ps1} run
// `bun install/configurator.ts`, and so do the install commands already handed out on the
// installer page. The form, the live verification and the writing all live next door.
import "./preflight/server.ts";
