#!/bin/sh
set -e

# Render's Docker Command field does not invoke a shell — it execs the first token
# directly and passes everything else as literal argv, so "&&"/"&" typed there are
# never interpreted. Keeping the real startup logic here, run by an actual shell,
# avoids that entirely.
#
# Reset the schema, reapply migrations, and reseed in the background so the server
# can bind its port immediately (Render's boot check needs this fast); a full
# reset+seed can take longer than that window allows. `exec` replaces this shell
# with node as PID 1 so it still receives signals (e.g. SIGTERM) correctly.
(npx prisma migrate reset --force && npx prisma db seed) &

exec node dist/server.js
