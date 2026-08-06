# KeeperHub fixtures

Run `npm run verify:keeperhub` with `KEEPERHUB_ACME_API_KEY` set. The verifier
saves unmodified responses under `raw/`, which is ignored because responses may
contain account data.

Review each response, remove secrets and personal data, then promote the minimum
payload needed for a test into this directory. Never hand-author a response
shape. Record its source operation and capture date beside the fixture.
