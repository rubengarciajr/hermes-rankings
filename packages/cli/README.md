# hermes-rank

Submit your [Hermes Agent](https://hermes-agent.nousresearch.com) achievements
to the public leaderboard at **[hermes-rankings.com](https://www.hermes-rankings.com)**.

## Install + run

```bash
npx hermes-rank submit
```

Or install globally:

```bash
npm install -g hermes-rank
hermes-rank submit
```

## What happens on first run

1. The CLI reads your local `state.json` + `scan_snapshot.json` from the
   Hermes Achievements plugin (no other files, no prompts, no code).
2. It opens `hermes-rankings.com/cli/verify` in your browser. Click the
   Cloudflare Turnstile widget once.
3. The CLI gets an API key, saves it to `~/.hermes-rank/identity.json`
   (chmod 600), and uploads your achievements.
4. You see your handle, score, and rank. Subsequent runs are silent.

## Commands

```
hermes-rank submit         # one-shot upload (registers on first run)
hermes-rank status         # current handle, score, last submit
hermes-rank doctor         # diagnose paths + server reachability
hermes-rank link-github    # attach GitHub for the Verified ring (+10 score)
hermes-rank reset          # wipe local identity (with confirm)
```

## Where the files live

The CLI looks for the standard Hermes Achievements plugin paths:

```
macOS / Linux  ~/.hermes/plugins/hermes-achievements/
Windows        %USERPROFILE%\.hermes\plugins\hermes-achievements\
Override       export HERMES_HOME=/path/to/.hermes
```

Run `hermes-rank doctor` to confirm what the CLI sees.

## Keep your rank fresh

After first run, every `hermes-rank submit` is a single HTTP POST — no
browser. Wire it into a scheduler:

```bash
# crontab (macOS / Linux): every 30 min
*/30 * * * * /usr/local/bin/hermes-rank submit >/dev/null 2>&1
```

Full install + scheduling guide:
<https://www.hermes-rankings.com/docs/install>

## What we send

Only your unlocked achievement IDs, tiers, and timestamps — derived from the
files Hermes already writes locally. No prompts, code, file contents, or
session text leaves your machine.

How we keep the leaderboard clean:
<https://www.hermes-rankings.com/docs/anti-abuse>

## License

MIT.
