# BharatPayU API

Base URL: `/api/v1`

## Auth

- `POST /auth/otp/verify`
- Body: `{ mobile, otp, device }`
- Returns JWT access token and sets an httpOnly refresh cookie.

## BBPS

- `POST /bbps/fetch-bill`
- `POST /bbps/pay`
- `GET /bbps/transactions`

Payment settlement flow:

1. Validate idempotency key.
2. Debit retailer main wallet.
3. Create pending BBPS transaction.
4. Call DigiSeva payment API.
5. On success, credit commission wallet, deduct TDS, write ledger, save API log, queue notifications.
6. On failure, refund main wallet immediately.
7. On pending, queue reconciliation status checks.

## Reports And Exports

- `GET /reports/admin-summary`
- `GET /reports/transactions`
- `GET /exports/transactions?format=csv|xlsx|pdf`

Supported filters: `serviceCategory`, `operator`, `retailerId`, `distributorId`, `status`, date range fields for extension.
