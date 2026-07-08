# Workout & Nutrition Features - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────┐   │
│  │   Nutrition  │  │    Workouts    │  │   Dashboard/         │   │
│  │    Page      │  │    Page        │  │   Analytics          │   │
│  └──────────────┘  └────────────────┘  └──────────────────────┘   │
│         │                    │                      │               │
│  ┌──────┴──────────────┬─────┴─────────┐     ┌──────┴──────┐      │
│  │                     │               │     │             │      │
│  ▼                     ▼               ▼     ▼             ▼      │
│ ┌──────────────┐  ┌─────────────┐  ┌────────────┐  ┌──────────┐ │
│ │BarcodeScanr ▼  │  MealPhoto  │  │FoodSearch  │  │RestTimer │ │
│ │ - Camera     │  │ - Upload    │  │- OpenFood  │  │- Alerts  │ │
│ │ - History    │  │ - AI est.   │  │- History   │  │- Presets │ │
│ └──────┬───────┘  └─────┬───────┘  └─────┬──────┘  └──────────┘ │
│        │                 │               │                       │
│        │  ┌──────────────┴───────────────┤                       │
│        │  │     Other Components         │                       │
│        │  │  - WorkoutBuilder            │                       │
│        │  │  - TemplatesLibrary          │                       │
│        │  │  - ExerciseDemo              │                       │
│        │  │  - WorkoutRating             │                       │
│        │  │  - WaterIntakeTracker        │                       │
│        │  │  - RecipeSuggestions         │                       │
│        └──┴────────────────────────────┘                       │
│                      │                                          │
│                      ▼                                          │
│             ┌──────────────────┐                              │
│             │ Authentication   │                              │
│             │ Context (Auth)   │                              │
│             └────────┬─────────┘                              │
│                      │                                          │
└──────────────────────┼──────────────────────────────────────────┘
                       │
           ┌───────────┼───────────┐
           │           │           │
           ▼           ▼           ▼
    [Access Token]  [User ID]  [Settings]
           │           │           │
           └───────────┼───────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API LAYER (FastAPI)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────┐                                         │
│  │  Auth Middleware     │                                         │
│  │  - JWT Verification  │                                         │
│  │  - User Lookup       │                                         │
│  └──────────┬───────────┘                                         │
│             │                                                     │
│   ┌─────────┼─────────────────────────────────────────────────┐  │
│   │                                                             │  │
│   ▼                    ▼                         ▼              │  │
│ ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐  │  │
│ │  Food       │  │  Water           │  │  Workouts API    │  │  │
│ │  Search     │  │  Intake          │  │                  │  │  │
│ │  Router     │  │  Router          │  │  - Templates     │  │  │
│ └────────┬────┘  └────────┬─────────┘  │  - Custom build  │  │  │
│          │                 │            │  - Ratings       │  │  │
│   ┌──────┴────────────┬────┴────────────┤  - Videos        │  │  │
│   │                   │                 └────────┬─────────┘  │  │
│   ▼                   ▼                          ▼             │  │
│ ┌────────────────┐  ┌─────────────┐  ┌────────────────────┐  │  │
│ │ Barcode        │  │ Meal Photos │  │ Nutrition & Recipe │  │  │
│ │ Scanner ✨NEW  │  │ Router      │  │ Router             │  │  │
│ │                │  │             │  │                    │  │  │
│ │- scan endpoint │  │ - upload    │  │ - suggestions      │  │  │
│ │- products      │  │ - analyze   │  │ - plans            │  │  │
│ │- quick-log     │  │ - estimate  │  │ - recipes          │  │  │
│ └────────────────┘  └─────────────┘  └────────────────────┘  │  │
│          │                │                     │              │  │
│   ┌──────┴─────────────────┼─────────────────────┴────────┐   │  │
│   │                        │                              │   │  │
│   ▼                        ▼                              ▼   │  │
│ ┌────────────────────────────────────────────────────────────┐  │  │
│ │         MEALS API ✨NEW                                   │  │  │
│ │    POST /api/meals - Unified meal logging                 │  │  │
│ │    GET  /api/meals - Get user meals                       │  │  │
│ └──────────────────────────┬───────────────────────────────┘  │  │
│                            │                                   │  │
└────────────────────────────┼───────────────────────────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    [Request Validation]  [Auth Check]  [Database Write]
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
┌─────────────────────────────────────────────────────────────────────┐
│                   DATABASE LAYER (SQLAlchemy)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐      │
│  │  Users   │  │  Meals   │  │ Barcode  │  │ Meal Photos  │      │
│  │          │  │          │  │ Items    │  │              │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘      │
│       │             │             │              │               │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴──────┐  ┌────┴──────┐       │
│  │  Settings│  │  Fitness │  │  Exercise │  │  Recipes  │       │
│  │          │  │  Logs    │  │  Videos   │  │           │       │
│  └──────────┘  └──────────┘  └───────────┘  └───────────┘       │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐      │
│  │Workouts  │  │ Nutrition│  │ Workout  │  │ Recipe       │      │
│  │ Plans    │  │ Plans    │  │ Ratings  │  │ Suggestions  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │           SQLite Database (fitness_coach.db)             │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
           │                         │                   │
           ▼                         ▼                   ▼
    ┌────────────────┐        ┌────────────┐    ┌─────────────────┐
    │ Cache recently │        │ Persist    │    │ Backup logs &   │
    │ scanned items  │        │ user data  │    │ analytics       │
    └────────────────┘        └────────────┘    └─────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────┐         ┌──────────────────────┐    │
│  │  OpenFoodFacts API       │         │  Claude Vision API   │    │
│  │  (FREE)                  │         │  (Optional - Future) │    │
│  │                          │         │                      │    │
│  │  - Food lookup           │         │  - Real meal         │    │
│  │  - Barcode lookup        │         │    analysis          │    │
│  │  - Nutrition data        │         │  - Calorie est.      │    │
│  │  - ~400k products        │         │  - Multi-item detect │    │
│  └──────────────────────────┘         └──────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Examples

### Example 1: Barcode Scan Flow
```
┌──────────┐
│  Camera  │
└────┬─────┘
     │ (capture barcode)
     ▼
┌─────────────────────────────┐
│ BarcodeScanner Component    │
│ - Detects barcode pattern   │
└────┬────────────────────────┘
     │
     ▼ POST /api/barcode-scanner/scan
┌─────────────────────────────┐
│ FastAPI Endpoint            │
│ - Validates barcode format  │
└────┬────────────────────────┘
     │
     ▼ Query OpenFoodFacts API
┌─────────────────────────────┐
│ OpenFoodFacts Database      │
│ - Lookup product data       │
└────┬────────────────────────┘
     │
     ▼ Return product data
┌─────────────────────────────┐
│ FastAPI Response            │
│ {barcode, name, calories... │
└────┬────────────────────────┘
     │
     ▼ Display in UI
┌─────────────────────────────┐
│ BarcodeScanner Component    │
│ - Show product details      │
│ - User adjusts quantity     │
└────┬────────────────────────┘
     │
     ▼ User clicks "Log Meal"
┌─────────────────────────────┐
│ POST /api/meals             │
│ - Log with meal type        │
└────┬────────────────────────┘
     │
     ▼ Save to database
┌─────────────────────────────┐
│ MealLog record created      │
│ - User ID, date, nutrition  │
└─────────────────────────────┘
```

### Example 2: Photo Analysis Flow
```
┌──────────────┐
│ User Camera  │
│ (takes photo)│
└────┬─────────┘
     │
     ▼
┌─────────────────────────────┐
│ MealPhotoAnalyzer Component │
│ - Upload with preview       │
└────┬────────────────────────┘
     │
     ▼ POST /api/meals/photos
┌─────────────────────────────┐
│ FastAPI Endpoint            │
│ - Store image               │
│ - Call AI (placeholder now) │
└────┬────────────────────────┘
     │
     ▼ Store in database + generate estimate
┌─────────────────────────────┐
│ MealPhoto record created    │
│ + Nutrition estimates       │
└────┬────────────────────────┘
     │
     ▼ Return to frontend
┌─────────────────────────────┐
│ MealPhotoAnalyzer Component │
│ - Show confidence score     │
│ - Display nutrition estimate│
└────┬────────────────────────┘
     │
     ▼ User reviews & adjusts
┌─────────────────────────────┐
│ POST /api/meals             │
│ - Log with AI estimates     │
└────┬────────────────────────┘
     │
     ▼ Save to database
┌─────────────────────────────┐
│ MealLog + MealPhoto linked  │
│ - Full nutrition history    │
└─────────────────────────────┘
```

### Example 3: Food Search Flow
```
┌──────────────────┐
│ User enters term │
│ "apple"          │
└────┬─────────────┘
     │
     ▼ onChange event
┌────────────────────────────┐
│ FoodSearchUI Component     │
│ - Debounce search input    │
└────┬───────────────────────┘
     │
     ▼ POST /api/food-search
┌────────────────────────────┐
│ FastAPI Endpoint           │
│ - Query OpenFoodFacts      │
└────┬───────────────────────┘
     │
     ▼ External API call
┌────────────────────────────┐
│ OpenFoodFacts Database     │
│ - Search for "apple"       │
│ - Return 15 results        │
└────┬───────────────────────┘
     │ [{"name": "Apple", "calories": 95...}, ...]
     │
     ▼ Return to frontend
┌────────────────────────────┐
│ FoodSearchUI Component     │
│ - Display results          │
│ - Add to search history    │
└────┬───────────────────────┘
     │
     ▼ User selects "Apple"
┌────────────────────────────┐
│ Show details               │
│ - Quantity selector        │
│ - Meal type dropdown       │
│ - Notes field              │
└────┬───────────────────────┘
     │
     ▼ User clicks "Log"
┌────────────────────────────┐
│ POST /api/meals            │
│ - Log apple with quantity  │
└────┬───────────────────────┘
     │
     ▼ Save to database
┌────────────────────────────┐
│ MealLog record created     │
│ - Source: "food_search"    │
└────────────────────────────┘
```

---

## Component Relationships

```
NutritionPage
├── BarcodeScanner (NEW)
│   ├── Camera feed
│   ├── Manual input
│   └── Recently scanned list
│       └── → POST /api/barcode-scanner/scan
│       └── → POST /api/meals
│
├── MealPhotoAnalyzer (NEW)
│   ├── Photo upload
│   ├── AI analysis
│   └── Confidence scoring
│       └── → POST /api/meals/photos
│       └── → POST /api/meals
│
├── FoodSearchUI (NEW)
│   ├── Search input
│   ├── Results list
│   └── Search history
│       └── → POST /api/food-search
│       └── → POST /api/meals
│
├── WaterIntakeTracker
│   └── → POST/GET /api/water-intake
│
├── TodayMeals
│   └── → GET /api/meals (today's logs)
│
└── RecipeSuggestions
    └── → GET /api/recipes

WorkoutPage
├── TemplatesLibrary
│   └── → GET /api/workouts/templates
│
├── CustomWorkoutBuilder
│   └── → POST /api/workouts/custom
│
├── RestTimer
│   └── (Client-side only, no API)
│
├── ExerciseDemo
│   └── → GET /api/workouts/videos
│
└── WorkoutRating
    └── → POST /api/workouts/ratings
```

---

## Database Relationships

```
users (1) ──┬─→ (many) meal_logs
            ├─→ (many) barcode_items
            ├─→ (many) meal_photos
            ├─→ (many) water_intake
            ├─→ (many) workout_plans
            ├─→ (many) nutrition_plans
            └─→ (many) recipe_suggestions

meal_logs ──→ contains nutrition data
meal_photos ──→ optional: linked to meal_log
barcode_items ──→ cache of scanned products
water_intake ──→ daily water logs
recipe_suggestions ──→ AI-generated meals
```

---

**Architecture designed for scalability, maintainability, and optimal UX**
