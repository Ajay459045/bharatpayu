# Architecture

BharatPayU is split into a Next.js portal and a NestJS API.

## Collections

Implemented or scaffolded collection schemas include:

- `users`
- `roles`
- `wallets`
- `wallettransactions`
- `bbpstransactions`
- `transactionlogs`
- `apilogs`
- `commissionslabs`
- `tdsreports`
- `ledgers`
- `notifications`
- `devices`
- `sessions`
- `servicetimings`
- `activitylogs`
- `exportlogs`
- `certificates`

## Modules

- Auth
- User
- Wallet
- BBPS
- Commission
- Ledger
- TDS
- Reports
- Export
- Notification
- Certificate
- Admin
- Distributor
- Retailer

## Accounting Rule

Wallet mutation, BBPS status mutation, TDS report creation, and ledger writes must happen inside MongoDB transactions whenever they are part of the same settlement event.
