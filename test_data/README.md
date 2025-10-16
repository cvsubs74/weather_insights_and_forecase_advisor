# Green Agent Test Data

This directory contains sample CSV files for testing the Green Agent's transaction parsing and carbon footprint calculation features.

## Test Files

### 1. `sample_bank_statement.csv`
**Purpose**: Standard test case with typical spending patterns
- **Date Range**: January 2024 (31 days)
- **Transaction Count**: 31 transactions
- **Categories**: Mixed (groceries, fuel, dining, air travel, utilities, shopping)
- **Expected Total Emissions**: ~1,200 kg CO2e
- **Use Case**: General testing and demo

### 2. `high_carbon_footprint.csv`
**Purpose**: Test case for high-emission lifestyle
- **Date Range**: February 2024 (28 days)
- **Transaction Count**: 13 transactions
- **Categories**: Heavy on air travel and fuel
- **Expected Total Emissions**: ~3,500 kg CO2e
- **Use Case**: Testing recommendation generation for high-impact categories

### 3. `low_carbon_footprint.csv`
**Purpose**: Test case for sustainable lifestyle
- **Date Range**: March 2024 (20 days)
- **Transaction Count**: 20 transactions
- **Categories**: Public transit, local produce, thrift shopping
- **Expected Total Emissions**: ~200 kg CO2e
- **Use Case**: Testing positive reinforcement and achievement system

### 4. `mixed_spending.csv`
**Purpose**: Comprehensive test with diverse spending
- **Date Range**: April 2024 (30 days)
- **Transaction Count**: 30 transactions
- **Categories**: Balanced mix of all categories
- **Expected Total Emissions**: ~1,500 kg CO2e
- **Use Case**: Testing categorization accuracy and balanced recommendations

## Column Name Variations

The test files use different column name formats to test the parser's flexibility:

| File | Date Column | Description Column | Amount Column |
|------|-------------|-------------------|---------------|
| sample_bank_statement.csv | `date` | `description` | `amount` |
| high_carbon_footprint.csv | `Date` | `Merchant` | `Debit` |
| low_carbon_footprint.csv | `Transaction Date` | `Details` | `Transaction Amount` |
| mixed_spending.csv | `date` | `description` | `amount` |

## Testing Workflow

### 1. Basic Upload and Parse
```
User: "I want to upload my bank statement"
Agent: [Routes to data_ingestion_agent]
User: [Uploads sample_bank_statement.csv]
Expected: Successfully parse 31 transactions
```

### 2. Categorization Test
```
Expected categories for sample_bank_statement.csv:
- groceries: Whole Foods, Safeway, Trader Joe's, Walmart (6 transactions)
- dining: Starbucks, Chipotle, Panera, Uber Eats (5 transactions)
- transportation_fuel: Shell, Chevron (4 transactions)
- transportation_public: Uber, Lyft, BART (3 transactions)
- air_travel: United, Delta (2 transactions)
- utilities_electricity: PG&E Electric (1 transaction)
- utilities_gas: PG&E Gas (1 transaction)
- shopping_electronics: Apple, Best Buy (2 transactions)
- shopping_clothing: Gap (1 transaction)
- entertainment: AMC, Netflix (2 transactions)
- healthcare: CVS (1 transaction)
```

### 3. Footprint Calculation Test
```
For sample_bank_statement.csv:
- Air travel (970.00 * 3.5) = 3,395 kg CO2e (highest)
- Transportation fuel (241.50 * 2.3) = 555 kg CO2e
- Shopping electronics (749.00 * 1.5) = 1,124 kg CO2e
- Total: ~5,500 kg CO2e
```

### 4. Recommendation Test
```
Expected top recommendations for sample_bank_statement.csv:
1. Choose direct flights (air travel category)
2. Carpool or use public transit (fuel category)
3. Buy refurbished electronics (electronics category)
```

### 5. Progress Tracking Test
```
Upload sequence:
1. low_carbon_footprint.csv (baseline: 200 kg CO2e)
2. sample_bank_statement.csv (current: 5,500 kg CO2e)
Expected: 2,650% increase (needs improvement message)

OR

1. high_carbon_footprint.csv (baseline: 3,500 kg CO2e)
2. low_carbon_footprint.csv (current: 200 kg CO2e)
Expected: 94% reduction (achievement unlocked!)
```

## Expected Emission Factors

| Category | Factor (kg CO2e per $1) |
|----------|------------------------|
| groceries | 0.5 |
| dining | 0.8 |
| transportation_fuel | 2.3 |
| transportation_public | 0.4 |
| air_travel | 3.5 |
| utilities_electricity | 0.9 |
| utilities_gas | 1.2 |
| shopping_clothing | 1.1 |
| shopping_electronics | 1.5 |
| entertainment | 0.6 |
| healthcare | 0.7 |
| other | 0.5 |

## Benchmarks

- **US Average**: 16,000 kg CO2e/year (~1,333 kg CO2e/month)
- **Global Average**: 4,000 kg CO2e/year (~333 kg CO2e/month)
- **Paris Agreement Target**: 2,000 kg CO2e/year (~167 kg CO2e/month)

## Testing Commands

```bash
# Navigate to green_agent directory
cd /Users/cvsubramanian/CascadeProjects/graphrag/agents/agents_for_impact

# Start ADK web server
adk web

# In the web UI, select green_agent
# Upload test files from test_data/ directory
```

## Expected Results Summary

| Test File | Total Spending | Total Emissions | vs US Avg | Top Category |
|-----------|---------------|-----------------|-----------|--------------|
| sample_bank_statement.csv | $2,829 | ~5,500 kg CO2e | 413% | Air Travel |
| high_carbon_footprint.csv | $5,888 | ~13,500 kg CO2e | 1,013% | Air Travel |
| low_carbon_footprint.csv | $744 | ~200 kg CO2e | 15% | Public Transit |
| mixed_spending.csv | $3,002 | ~2,800 kg CO2e | 210% | Electronics |

---

**Note**: These are test files with realistic but synthetic data. Actual results may vary slightly based on categorization logic.
