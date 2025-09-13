# Thapar SwapShop API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Response Format
All API responses follow this format:
```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "error": null
}
```

## Error Responses
```json
{
  "success": false,
  "data": null,
  "message": "Error message",
  "error": "Detailed error information"
}
```

---

## Authentication Endpoints

### POST /auth/signup
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@thapar.edu",
  "password": "password123",
  "hostel": "A",
  "roomNo": "101"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@thapar.edu",
    "hostel": "A",
    "roomNo": "101",
    "role": "user",
    "trustScore": 650,
    "starRating": 3,
    "rewardPoints": 0
  }
}
```

### POST /auth/login
Login user.

**Request Body:**
```json
{
  "email": "john@thapar.edu",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": { /* user object */ }
}
```

### GET /auth/me
Get current user information. **Requires authentication.**

**Response:**
```json
{
  "success": true,
  "user": { /* user object */ }
}
```

---

## Items Endpoints

### GET /items
Get all items with optional filters.

**Query Parameters:**
- `category` - Filter by category (Electronics, Books, Medicines, Toiletries, Eatables)
- `transactionType` - Filter by type (lend, sell)
- `hostel` - Filter by hostel (A-P)
- `search` - Search in title and description
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "_id": "item_id",
      "title": "Physics Textbook",
      "description": "Resnick Halliday Krane Physics",
      "category": "Books",
      "transactionType": "lend",
      "condition": "Good",
      "price": 0,
      "isAvailable": true,
      "owner": {
        "_id": "owner_id",
        "name": "John Doe",
        "hostel": "A",
        "trustScore": 720
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "current": 1,
    "total": 5,
    "count": 10,
    "totalCount": 45
  }
}
```

### POST /items
Create a new item. **Requires authentication.**

**Request Body:**
```json
{
  "title": "Physics Textbook",
  "description": "Resnick Halliday Krane Physics textbook in good condition",
  "category": "Books",
  "transactionType": "lend",
  "condition": "Good",
  "price": 0,
  "duration": 7
}
```

### GET /items/:id
Get a specific item.

### PUT /items/:id
Update an item. **Requires authentication and ownership.**

### DELETE /items/:id
Delete an item. **Requires authentication and ownership.**

---

## Requests Endpoints

### GET /requests
Get all requests with optional filters.

**Query Parameters:**
- `category` - Filter by category
- `status` - Filter by status (active, fulfilled, closed)
- `search` - Search in title and description

### POST /requests
Create a new request. **Requires authentication.**

**Request Body:**
```json
{
  "title": "Need Physics Textbook",
  "description": "Looking for Resnick Halliday Krane Physics textbook",
  "category": "Books",
  "urgency": "medium"
}
```

### PUT /requests/:id
Update a request. **Requires authentication and ownership.**

### DELETE /requests/:id
Delete a request. **Requires authentication and ownership.**

---

## Transactions Endpoints

### GET /transactions
Get user's transactions. **Requires authentication.**

**Query Parameters:**
- `status` - Filter by status (pending, active, completed, cancelled)
- `type` - Filter by type (borrow, lend)

### POST /transactions
Create a new transaction. **Requires authentication.**

**Request Body:**
```json
{
  "itemId": "item_id",
  "borrower": "borrower_id",
  "startDate": "2024-01-01",
  "endDate": "2024-01-08",
  "message": "Need for physics exam"
}
```

### PUT /transactions/:id
Update transaction status. **Requires authentication.**

---

## Trust Score Endpoints

### GET /trustscore/me
Get current user's detailed trust score. **Requires authentication.**

**Response:**
```json
{
  "success": true,
  "trustScore": {
    "currentScore": 720,
    "starRating": 4,
    "trustLevel": "Good",
    "totalTransactions": 15,
    "positiveTransactions": 12,
    "negativeTransactions": 3,
    "lastActivityAt": "2024-01-01T00:00:00.000Z",
    "isFirstTransaction": false,
    "recentTransactions": [
      {
        "type": "lender_ontime_return",
        "impact": 80,
        "description": "Successfully lent item, returned on time",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### GET /trustscore/user/:userId
Get public trust score for a specific user. **Requires authentication.**

### GET /trustscore/leaderboard
Get trust score leaderboard. **Requires authentication.**

**Query Parameters:**
- `limit` - Number of users to return (default: 10)

### POST /trustscore/initialize
Initialize trust score for current user. **Requires authentication.**

---

## Wishlist Endpoints

### GET /wishlist
Get user's wishlist. **Requires authentication.**

### POST /wishlist
Add item to wishlist. **Requires authentication.**

**Request Body:**
```json
{
  "itemId": "item_id"
}
```

### DELETE /wishlist/:itemId
Remove item from wishlist. **Requires authentication.**

### GET /wishlist/check/:itemId
Check if item is in user's wishlist. **Requires authentication.**

---

## Admin Endpoints

All admin endpoints require admin authentication.

### GET /admin/dashboard
Get admin dashboard statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 150,
    "totalItems": 89,
    "totalTransactions": 234,
    "totalRequests": 45,
    "activeUsers": 12,
    "recentActivity": [
      {
        "type": "user_signup",
        "user": "John Doe",
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### GET /admin/users
Get all users with pagination and filters.

### GET /admin/items
Get all items with admin details.

### GET /admin/requests
Get all requests with admin details.

### GET /trustscore/admin/all
Get all trust scores for admin management.

### POST /trustscore/admin/adjust
Manually adjust user's trust score.

**Request Body:**
```json
{
  "userId": "user_id",
  "impact": -50,
  "reason": "Late return penalty",
  "adminNotes": "User returned item 3 days late"
}
```

### POST /trustscore/admin/penalty
Apply admin penalty to user.

### POST /trustscore/admin/initialize-all
Initialize trust scores for all users.

---

## Health Check

### GET /health
Check API health status.

**Response:**
```json
{
  "uptime": 3600.5,
  "message": "OK",
  "timestamp": 1640995200000,
  "environment": "development",
  "database": "connected"
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 500 | Internal Server Error |

---

## Rate Limiting

- **Window**: 15 minutes
- **Limit**: 100 requests per window per IP
- **Headers**: 
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Reset time

---

## Trust Score Calculation

### Base Score: 650 points

### Transaction Points:
- **Lender On-time Return**: +80 points
- **Fulfilled Request**: +60 points  
- **Borrower On-time Return**: +40 points
- **First Transaction**: +30 points
- **Early Return**: +20 points
- **Non-return**: -100 points
- **Admin Penalty**: -70 points
- **Late Return**: -50 points
- **Unfair Cancellation**: -40 points
- **Inactivity**: -20 points

### Weighting:
- Recent transactions (last 3): **2x weight**
- Older transactions: **1x weight**

### Score Range: 300-900 points

### Star Rating:
- ⭐⭐⭐⭐⭐ Excellent (820-900)
- ⭐⭐⭐⭐ Good (720-819)  
- ⭐⭐⭐ Fair (600-719)
- ⭐⭐ Risky (450-599)
- ⭐ Very Poor (300-449)