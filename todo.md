# Auctor TODO

## V2 — user-owned AgentQA credentials

- After first authentication and KeeperHub agent provisioning, show **Secure your AgentQA memory**.
- Ask the user to create and confirm a dedicated memory recovery passphrase.
- Never reuse a wallet signature, wallet password, email password, or deployment secret.
- Store only a secure verifier and/or wrapped per-user memory key; never store the plaintext passphrase.
- Add explicit unlock, recovery, rotation, device migration, and lost-passphrase behavior.
- Migrate existing deployment-derived AgentQA identities without losing or silently forking memory.
- Keep the current server-derived AgentQA identity for V1 until this migration is designed, implemented, and tested.

## V1 release path

- Complete testnet swap preview → approval → KeeperHub execution → receipt → Audit → in-app/Telegram notification.
- Connect each authenticated Auctor user to the Auctor Telegram bot with an expiring one-time pairing code.
- Route paired Telegram messages through the same agent, memory, policy, research, simulation, execution, and audit boundaries as the website.
