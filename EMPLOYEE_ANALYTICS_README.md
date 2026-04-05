# Employee Performance Analytics

## Overview

The Employee Performance Analytics system provides comprehensive tracking of team member contributions, including:

- **User and Role-wise Analytics**: Summary statistics by user role (ADMIN, USER, etc.)
- **Product Tracking**: Count of products added by each employee with quality metrics
- **Work History**: Complete timeline of all employee activities
- **Performance Scoring**: Automated performance score calculation based on contributions

## Key Features

### 1. Employee Dashboard (`/admin/employees`)
Displays:
- Total team members and their contributions
- Role-wise analytics breakdown
- Filterable employee list with performance scores
- Sorting options: Performance Score, Products Added, Name, Recent Join Date

### 2. Individual Employee Profile (`/admin/employees/[id]`)
Shows:
- Complete work history timeline
- Product contribution list with details
- Performance metrics and quality indicators
- Activity breakdown by type

### 3. Analytics Metrics

#### Performance Score Calculation
- **Product Contribution (0-40 pts)**: Based on total products added
- **Product Quality (0-20 pts)**: Active products / total products ratio
- **Views Impact (0-25 pts)**: Total unique device views from products
- **Review Contributions (0-15 pts)**: Approved reviews submitted

#### Stats Tracked Per Employee
- `productsAdded`: Total products created
- `activeProducts`: Currently active/published products
- `totalViews`: Cumulative unique device views across products
- `reviewsSubmitted`: Total reviews submitted
- `reviewsApproved`: Approved review count
- `avgRating`: Average rating of submitted reviews

### 4. Role-wise Analytics
Summary statistics for each role:
- Number of members in role
- Average products contributed
- Average views per member
- Average reviews per member
- Average performance score

## Setup Requirements

### 1. Track Product Creator

To properly track which employee created which product, update the product creation flow to include `createdBy`:

```javascript
// In your product creation API/component
const newProduct = {
    // ... existing fields ...
    createdBy: userId,  // Store the user ID who created this product
    createdAt: now,
    updatedAt: now,
}
```

### 2. Update Existing Products (Optional)

If you have existing products without `createdBy`, you can backfill them:

```javascript
// Backfill script to associate products with an admin
const adminId = 'your-admin-user-id'
const snapshot = await dbAdmin.collection('products').get()

const batch = dbAdmin.batch()
snapshot.forEach(doc => {
    if (!doc.data().createdBy) {
        batch.update(doc.ref, { createdBy: adminId })
    }
})
await batch.commit()
```

### 3. Track Review Creators

Similarly, ensure reviews track the userId:

```javascript
const newReview = {
    // ... existing fields ...
    userId: currentUserId,  // User who submitted the review
    createdAt: now,
}
```

## API Reference

### GET `/api/admin/employees`

Returns comprehensive employee analytics data.

**Response:**
```json
{
    "employees": [
        {
            "id": "user-id",
            "name": "John Doe",
            "email": "john@example.com",
            "role": "ADMIN",
            "createdAt": "2024-01-01T00:00:00Z",
            "lastSeenAt": "2024-04-03T10:00:00Z",
            "stats": {
                "productsAdded": 25,
                "activeProducts": 23,
                "totalViews": 1250,
                "reviewsSubmitted": 10,
                "reviewsApproved": 8,
                "avgRating": 4.5,
                "performanceScore": 82
            },
            "workHistory": {
                "products": [...],
                "reviews": [...]
            }
        }
    ],
    "roleStats": {
        "ADMIN": {
            "count": 2,
            "totalProducts": 50,
            "avgProducts": "25.0",
            "totalViews": 2500,
            "avgViews": "1250",
            "totalReviews": 20,
            "avgReviews": "10.0",
            "avgPerformanceScore": "82"
        }
    },
    "summary": {
        "totalEmployees": 10,
        "totalProducts": 150,
        "totalReviews": 50,
        "avgProductsPerEmployee": "15.0",
        "avgReviewsPerEmployee": "5.0"
    }
}
```

## Navigation

**Sidebar:** 
- Go to Admin Panel → **Employee Performance** (new link)

**Pages:**
- Overview: `/admin/employees`
- Individual Profile: `/admin/employees/[userId]`

## Filtering & Sorting

### Filters
- **All Roles**: Show all employees
- **By Role**: Filter by ADMIN, USER, etc.

### Sort Options
1. **Performance Score** (default): Highest to lowest scores
2. **Products Added**: Most to least products
3. **Name**: Alphabetical A-Z
4. **Recent Join**: Most recently joined first

## Insights & Best Practices

### Identifying Top Performers
- Look for high performance scores (80+)
- Check product quality (active % indicator)
- Review total views for market impact

### Quality Indicators
- **Active Rate**: % of products that are currently active
- **Approval Rate**: % of reviews that get approved
- **Views/Product**: Average engagement per product

### Performance Score Interpretation
- **80+**: Excellent contributor
- **60-79**: Good contributor
- **40-59**: Average contributor
- **Below 40**: Needs support

## Future Enhancements

Potential additions:
- Time-series performance trends
- Comparative analytics (employee vs. team average)
- Performance goals and targets
- Activity notifications and milestones
- Export/reporting features
- Team member productivity reports
