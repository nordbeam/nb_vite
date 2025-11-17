#!/bin/bash
# Simple SSR Performance Benchmark

set -e

echo "🔬 SSR Performance Benchmark"
echo "============================"
echo ""

# Test configuration
WARMUP=5
ITERATIONS=50
SSR_URL="http://localhost:5173/ssr"
HEALTH_URL="http://localhost:5173/ssr-health"
PAYLOAD='{"component":"Home","props":{},"url":"/","version":"test123"}'

# Check if SSR is ready
echo "⏳ Checking SSR endpoint..."
HEALTH=$(curl -s "$HEALTH_URL")
echo "✅ $HEALTH"
echo ""

# Warmup
echo "🔥 Warming up ($WARMUP requests)..."
for i in $(seq 1 $WARMUP); do
    curl -s -X POST "$SSR_URL" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" > /dev/null
done

echo "📊 Running benchmark ($ITERATIONS requests)..."
echo ""

# Create temp file for timings
TIMINGS=$(mktemp)

for i in $(seq 1 $ITERATIONS); do
    # Use curl's time_total output
    TIME=$(curl -s -w "%{time_total}" -o /dev/null -X POST "$SSR_URL" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")
    echo "$TIME" >> "$TIMINGS"

    # Progress indicator
    if [ $((i % 10)) -eq 0 ]; then
        echo "  Completed $i/$ITERATIONS requests..."
    fi
done

echo ""
echo "📈 Results:"
echo "=========="

# Calculate statistics
TOTAL=$(awk '{sum+=$1} END {print sum}' "$TIMINGS")
AVG=$(awk '{sum+=$1} END {print sum/NR}' "$TIMINGS")
MIN=$(sort -n "$TIMINGS" | head -1)
MAX=$(sort -n "$TIMINGS" | tail -1)

# Calculate median
MEDIAN=$(sort -n "$TIMINGS" | awk '{arr[NR]=$1} END {
    if (NR % 2 == 1) print arr[(NR+1)/2]
    else print (arr[NR/2] + arr[NR/2+1]) / 2
}')

# Calculate p95
P95=$(sort -n "$TIMINGS" | awk '{arr[NR]=$1} END {
    idx = int(NR * 0.95)
    if (idx < 1) idx = 1
    print arr[idx]
}')

# Calculate requests per second
REQ_PER_SEC=$(echo "scale=2; $ITERATIONS / $TOTAL" | bc)

echo "  Total requests: $ITERATIONS"
echo "  Total time: ${TOTAL}s"
echo ""
echo "  Average: $(printf "%.0f" $(echo "$AVG * 1000" | bc))ms"
echo "  Median:  $(printf "%.0f" $(echo "$MEDIAN * 1000" | bc))ms"
echo "  Min:     $(printf "%.0f" $(echo "$MIN * 1000" | bc))ms"
echo "  Max:     $(printf "%.0f" $(echo "$MAX * 1000" | bc))ms"
echo "  P95:     $(printf "%.0f" $(echo "$P95 * 1000" | bc))ms"
echo ""
echo "  Throughput: ${REQ_PER_SEC} req/s"

rm -f "$TIMINGS"
