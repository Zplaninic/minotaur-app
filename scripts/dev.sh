#!/usr/bin/env bash
# Starts the database and every dev server in a 2x2 grid of panes:
#   shared   | backend
#   frontend | mobile
# - in iTerm: a new tab in the current window, split into four panes
# - elsewhere: a tmux session with four panes; running the script again
#   reattaches instead of starting a second one
set -euo pipefail

SESSION=minotaur
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Runs inside one iTerm pane: titles the pane, then starts its service.
# The title is set after the shell's own auto-title (oh-my-zsh) has run.
if [ "${1:-}" = "--pane" ]; then
  service="$2"
  printf '\033]0;%s\007' "$service"
  cd "$ROOT"
  exec pnpm --filter "@repo/$service" dev
fi

docker compose -f "$ROOT/docker-compose.yml" up -d --wait

if [ "${TERM_PROGRAM:-}" = "iTerm.app" ]; then
  osascript - "$ROOT" <<'APPLESCRIPT'
on start(paneSession, root, service)
  tell application "iTerm"
    tell paneSession
      set name to service
      write text quoted form of (root & "/scripts/dev.sh") & " --pane " & service
    end tell
  end tell
end start

on run argv
  set root to item 1 of argv
  tell application "iTerm"
    tell current window
      set newTab to (create tab with default profile)
      set topLeft to current session of newTab
      tell topLeft to set topRight to (split vertically with default profile)
      tell topLeft to set bottomLeft to (split horizontally with default profile)
      tell topRight to set bottomRight to (split horizontally with default profile)
    end tell
  end tell
  my start(topLeft, root, "shared")
  my start(topRight, root, "backend")
  my start(bottomLeft, root, "frontend")
  my start(bottomRight, root, "mobile")
end run
APPLESCRIPT
  exit 0
fi

if ! tmux has-session -t "$SESSION" 2>/dev/null; then
  # Commands are typed into a shell rather than run directly, so a crashed
  # server leaves its pane open with the error and a prompt to restart it.
  tmux new-session -d -s "$SESSION" -c "$ROOT"
  tmux split-window -t "$SESSION" -h -c "$ROOT"
  tmux split-window -t "$SESSION:0.0" -v -c "$ROOT"
  tmux split-window -t "$SESSION:0.2" -v -c "$ROOT"
  tmux select-layout -t "$SESSION" tiled
  # Each pane shows its service name in its top border; the servers may not rename it.
  tmux set-option -w -t "$SESSION" pane-border-status top
  tmux set-option -w -t "$SESSION" pane-border-format " #{pane_title} "
  tmux set-option -w -t "$SESSION" allow-set-title off
  pane=0
  for service in shared backend frontend mobile; do
    tmux select-pane -t "$SESSION:0.$pane" -T "$service"
    tmux send-keys -t "$SESSION:0.$pane" "pnpm --filter @repo/$service dev" C-m
    pane=$((pane + 1))
  done
fi

if [ -n "${TMUX:-}" ]; then
  tmux switch-client -t "$SESSION"
else
  tmux attach -t "$SESSION"
fi
