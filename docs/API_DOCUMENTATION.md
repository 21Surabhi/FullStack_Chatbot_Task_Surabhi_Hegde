# API Documentation

Base URL: `http://localhost:4000/api`
Format: JSON for all requests and responses.

## Authentication

Admin endpoints need a token. Get one from `POST /auth/login`, then send it on every admin request:

```
Authorization: Bearer <token>
```

Tokens expire after 8 hours. A missing, invalid or expired token returns `401 {"error":"Unauthorized"}`.

## Error format

```json
{ "error": "Message describing the problem" }
```

Validation errors also include the failing fields:

```json
{
  "error": "Validation failed",
  "fields": { "email": ["Enter a valid email"] }
}
```

## Status codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 204 | Success, no content |
| 400 | Validation failed or invalid input |
| 401 | Unauthorized (missing or bad token, wrong login) |
| 404 | Not found |
| 429 | Too many requests (rate limit) |
| 500 | Server error (generic message) |

## Limits

- Request body: 10 KB maximum
- General API: 300 requests per 15 minutes per IP
- Login: 10 attempts per 15 minutes per IP

---

## GET /health

Checks that the server is running.

Response `200`:
```json
{ "ok": true }
```

---

## POST /chat

Returns the chatbot's reply to a message.

Request:
```json
{ "message": "what is the price" }
```

| Field | Rules |
|---|---|
| message | Required, 1 to 300 characters |

Response `200`:
```json
{
  "reply": "Pricing depends on the service and project scope. Send an enquiry and we will share a quote.",
  "suggestions": ["Drone services", "Courses & training", "Pricing", "Contact us", "Send an enquiry"],
  "startEnquiry": false
}
```

`startEnquiry` is `true` when the frontend should show the enquiry form in the chat.

---

## POST /enquiries

Creates a new enquiry. Public.

Request:
```json
{
  "name": "Asha Rao",
  "email": "asha@example.com",
  "phone": "+91 98765 43210",
  "service": "training",
  "message": "I want to join the next batch"
}
```

| Field | Rules |
|---|---|
| name | Required, 2 to 80 characters |
| email | Required, valid email, up to 120 characters |
| phone | Optional, 7 to 16 characters: digits, spaces, dashes, may start with `+` |
| service | Required: `aerial_media`, `mapping_survey`, `training`, `events` or `other` |
| message | Required, 10 to 1000 characters |

Response `201`:
```json
{ "id": 2 }
```

Response `400` (example):
```json
{
  "error": "Validation failed",
  "fields": { "name": ["Name must be at least 2 characters"] }
}
```

---

## POST /auth/login

Logs in an admin. Public, rate limited.

Request:
```json
{ "email": "admin@example.com", "password": "your-password" }
```

Response `200`:
```json
{ "token": "<jwt>" }
```

Response `401`:
```json
{ "error": "Invalid email or password" }
```

---

## GET /enquiries

Lists enquiries with search, filters, sorting and pagination. Admin only.

Query parameters (all optional):

| Parameter | Values | Default |
|---|---|---|
| search | Text matched against name, email and message (max 80 characters) | none |
| status | `new`, `contacted`, `closed` | all |
| service | `aerial_media`, `mapping_survey`, `training`, `events`, `other` | all |
| sort | `newest`, `oldest`, `name` | `newest` |
| page | Whole number, 1 or more | 1 |
| limit | 1 to 50 | 10 |

Example:
```
GET /enquiries?search=asha&status=contacted&sort=newest&page=1&limit=8
```

Response `200`:
```json
{
  "items": [
    {
      "id": 2,
      "name": "Asha Rao",
      "email": "asha@example.com",
      "phone": null,
      "service": "training",
      "message": "I want to join the next batch",
      "status": "contacted",
      "source": "form",
      "created_at": "2026-10-04 06:42:41"
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

Response `400` for invalid options: `{ "error": "Invalid query options" }`

---

## GET /enquiries/:id

Returns one enquiry. Admin only.

Response `200`: a single enquiry object (same shape as an item above).
Response `400`: `{ "error": "Invalid id" }`
Response `404`: `{ "error": "Not found" }`

---

## PATCH /enquiries/:id

Updates an enquiry's status. Admin only.

Request:
```json
{ "status": "contacted" }
```

| Field | Rules |
|---|---|
| status | Required: `new`, `contacted` or `closed` |

Response `200`: the updated enquiry object.
Response `400`: `{ "error": "Invalid id or status" }`
Response `404`: `{ "error": "Not found" }`

---

## DELETE /enquiries/:id

Deletes an enquiry. Admin only.

Response `204`: no body.
Response `400`: `{ "error": "Invalid id" }`
Response `404`: `{ "error": "Not found" }`

---

## Examples (PowerShell)

```powershell

Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/enquiries -ContentType "application/json" -Body '{"name":"Asha Rao","email":"asha@example.com","service":"training","message":"I want to join the next batch"}'


$r = Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/auth/login -ContentType "application/json" -Body '{"email":"admin@example.com","password":"your-password"}'
Invoke-RestMethod "http://localhost:4000/api/enquiries?status=new" -Headers @{Authorization="Bearer $($r.token)"}
```