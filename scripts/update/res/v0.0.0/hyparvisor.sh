cd "$(dirname "$0")"
/root/.proto/shims/bun ./app/hyparvisor.js -- --htdocs ./app/htdocs $@
