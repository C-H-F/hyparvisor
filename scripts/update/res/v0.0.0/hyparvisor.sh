cd "$(dirname "$0")/.."
/root/.proto/tools/bun/${bunVersion}/bun ./app/hyparvisor.js -- $@
