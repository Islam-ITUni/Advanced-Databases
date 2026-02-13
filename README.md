# Advanced Databases Final Project - Coffee Shop Management System

This repository contains a full-stack web application for the Advanced Databases (NoSQL) final project.

- Backend: Node.js + Express + MongoDB (Mongoose)
- Frontend: multi-page HTML/CSS/JavaScript UI
- API style: versioned REST (`/api/v1`)
- Documentation: detailed README + generated DOCX report

## 1. Document Requirements Coverage

This section maps the instructor checklist to project artifacts.

- Cover page including name, group, topic, department: included in `Final_Report_CoffeeShop.docx` (generated from `scripts/generate-report.js`).
- At least 10 pages: report generator creates sectioned content with page breaks across 12 chapters.
- Project overview: this README section `2. Project Overview` and report chapter `2. Project Overview`.
- System architecture: this README section `3. System Architecture` and report chapter `3. System Architecture`.
- Database schema description: this README section `4. Database Schema Description` and report chapter `4. Database Schema Description`.
- MongoDB queries: this README section `5. MongoDB Queries and Operations` and report chapters `5` and `6`.
- API documentation: this README section `6. API Documentation` and Swagger at `/api-docs`.
- Indexing and optimization strategy: this README section `7. Indexing and Optimization Strategy` and report chapter `8`.
- Contribution of each student: this README section `8. Contribution of Each Student` and report chapter `11`.

## 2. Project Overview

The system models operational workflows for a coffee shop domain:

- authentication and role-aware access
- shop creation and staff assignment
- order creation and lifecycle updates
- embedded item and note operations
- analytics for management decisions

The implementation demonstrates practical NoSQL design choices rather than isolated CRUD endpoints.

## 3. System Architecture

The project follows a layered architecture:

- Client layer: static pages in `frontend/` call backend APIs via fetch.
- Route layer: endpoint definitions in `src/routes/`.
- Controller layer: business logic and query orchestration in `src/controllers/`.
- Middleware layer: auth, validation, authorization, and error handling in `src/middlewares/`.
- Data layer: Mongoose models in `src/models/` on MongoDB collections.

Main request flow:

1. Frontend sends JWT-authenticated request.
2. Middleware validates token and payload.
3. Controller applies business rules and permissions.
4. Mongoose performs MongoDB operation.
5. JSON response returns to UI.

## 4. Database Schema Description

### Collections

- `users` (`src/models/User.js`)
- `coffeeshops` (`src/models/Project.js`)
- `coffeeorders` (`src/models/WorkItem.js`)
- `activitylogs` (`src/models/ActivityLog.js`)

### Referenced modeling

- Shop owner: `CoffeeShop.owner -> User`
- Shop staff: `CoffeeShop.staff.user -> User`
- Order links: `CoffeeOrder.shop`, `CoffeeOrder.cashier`, `CoffeeOrder.createdBy`

### Embedded modeling

- `CoffeeOrder.items[]` for line-item locality and atomic item updates
- `CoffeeOrder.notes[]` for order-scoped comments/history

This mixed model satisfies both relation clarity (references) and mutation efficiency (embedded arrays).

## 5. MongoDB Queries and Operations

### CRUD examples

- Create shop/order: `createShop`, `createOrder`
- Read with filtering/search/pagination: `listShops`, `listOrders`
- Update partial entities: `updateShop`, `updateOrder`
- Delete/archive operations: `deleteOrder`, `deleteShop`

### Advanced operators used

- `$push`: add embedded order item/note
- `$pull`: remove embedded order item/note
- `$inc`: increment/decrement embedded item quantity
- `$set`: update user role and nested item status
- positional operator (`items.$`): target one embedded item
- `$text`: search across indexed text fields

### Aggregation pipelines

- `GET /analytics/shops/:shopId/summary`
  - `$match`, `$facet`, `$group`, `$unwind`, `$sort`, `$limit`
- `GET /analytics/staff/performance`
  - `$match`, `$group`, `$lookup`, `$project`, `$sort`

## 6. API Documentation

Swagger/OpenAPI is available at:

- `http://localhost:5000/api-docs`

API base:

- `http://localhost:5000/api/v1`

### Endpoint groups

- Auth: register/login/current user
- Shops: shop CRUD + staff management
- Orders: order CRUD + items/notes nested operations
- Analytics: shop summary + staff performance
- Admin: users listing + role update

Core route registration is defined in `src/routes/index.js`. Swagger spec is built in `src/config/swagger.js`.

## 7. Indexing and Optimization Strategy

### Implemented indexes

- CoffeeShop: `{ owner: 1, createdAt: -1 }`
- CoffeeShop: `{ status: 1, "location.city": 1 }`
- CoffeeShop: `{ "staff.user": 1, status: 1 }`
- CoffeeShop text index: `name`, `description`, `location.city`
- CoffeeOrder: `{ shop: 1, status: 1, createdAt: -1 }`
- CoffeeOrder: `{ cashier: 1, paymentStatus: 1, createdAt: -1 }`
- CoffeeOrder text index: `customerName`, `items.menuItemName`

### Query optimization decisions

- pagination and capped page sizes
- scoped queries based on staff membership
- sort by indexed fields where possible
- selective population for smaller payloads
- aggregation endpoints tailored to business questions

## 8. Contribution of Each Student

- Student 1 (Ardak): backend architecture, auth/authorization, primary schemas, core CRUD routes, middleware integration.
- Student 2 (Islam): advanced MongoDB updates, aggregation analytics, indexing alignment, frontend API integration.
- Shared: integration testing, requirement mapping, README/report preparation, defense preparation.

Update this section if your final team split differs.

## 9. Local Setup

1. Install dependencies.

```bash
npm install
```

2. Create `.env`.

```bash
Copy-Item .env.example .env -Force
```

3. Start MongoDB.

4. Run the app.

```bash
npm run dev
```

## 10. URLs

- Frontend login: `http://localhost:5000/`
- Dashboard: `http://localhost:5000/dashboard.html`
- Swagger docs: `http://localhost:5000/api-docs`
- API base: `http://localhost:5000/api/v1`

## 11. Scripts

- `npm run dev`: start dev server (nodemon)
- `npm start`: start production server
- `npm run check`: syntax/health checks
- `npm run report`: generate `Final_Report_CoffeeShop.docx`

## 12. Report

Generated report file:

- `Final_Report_CoffeeShop.docx`

Generator source:

- `scripts/generate-report.js`
