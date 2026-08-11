# KeeperHub integration recommendations

These are product recommendations for KeeperHub that would make consumer agent onboarding substantially easier:

- Provide a partner or service API to provision a verified KeeperHub organization and Turnkey wallet for an email-authenticated Auctor user, without requiring the user to understand SIWE.
- Support delegated organization creation with explicit per-organization spending policies, chain allowlists, protocol allowlists, daily caps, and approval thresholds.
- Expose wallet provisioning state and organization wallet identifiers through a stable API so Auctor can show setup progress safely.
- Support a first-class account-linking flow between an Auctor user and a KeeperHub organization.

Until this exists, Auctor uses SIWE for wallet-native onboarding and fails closed when no KeeperHub wallet is linked.