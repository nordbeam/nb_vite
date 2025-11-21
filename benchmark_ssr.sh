#!/bin/bash
# SSR Performance Benchmark: vite-node vs Module Runner API

set -e

echo "🔬 SSR Performance Benchmark"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
WARMUP_REQUESTS=5
TEST_REQUESTS=100
SSR_URL="http://localhost:5173/ssr"
HEALTH_URL="http://localhost:5173/ssr-health"

# Test payload
PAYLOAD='{"component":"Home","props":{},"url":"/","version":"test123"}'

# Function to wait for SSR to be ready
wait_for_ssr() {
    echo "⏳ Waiting for SSR endpoint to be ready..."
    for i in {1..30}; do
        if curl -s "$HEALTH_URL" > /dev/null 2>&1; then
            echo "✅ SSR endpoint is ready"
            return 0
        fi
        sleep 1
    done
    echo "❌ SSR endpoint did not become ready"
    return 1
}

# Function to run SSR benchmark
run_benchmark() {
    local name=$1
    echo ""
    echo -e "${BLUE}Testing: $name${NC}"
    echo "----------------------------------------"

    # Wait for SSR to be ready
    wait_for_ssr

    # Warmup
    echo "🔥 Warming up ($WARMUP_REQUESTS requests)..."
    for i in $(seq 1 $WARMUP_REQUESTS); do
        curl -s -X POST "$SSR_URL" \
            -H "Content-Type: application/json" \
            -d "$PAYLOAD" > /dev/null 2>&1 || true
    done

    echo "📊 Running benchmark ($TEST_REQUESTS requests)..."

    # Create temporary file for results
    RESULTS_FILE=$(mktemp)

    # Run benchmark with Apache Bench if available, otherwise use curl with time
    if command -v ab > /dev/null 2>&1; then
        # Use Apache Bench
        ab -n $TEST_REQUESTS -c 1 -p <(echo "$PAYLOAD") -T "application/json" "$SSR_URL" 2>&1 | tee "$RESULTS_FILE"

        # Extract metrics
        REQUESTS_PER_SEC=$(grep "Requests per second" "$RESULTS_FILE" | awk '{print $4}')
        TIME_PER_REQUEST=$(grep "Time per request" "$RESULTS_FILE" | grep -v "across" | awk '{print $4}')

        echo ""
        echo -e "${GREEN}Results:${NC}"
        echo "  Requests per second: $REQUESTS_PER_SEC req/s"
        echo "  Time per request: $TIME_PER_REQUEST ms"

    else
        # Fallback to curl with timing
        echo "  (Apache Bench not available, using curl timing)"
        TOTAL_TIME=0
        SUCCESS_COUNT=0

        for i in $(seq 1 $TEST_REQUESTS); do
            START=$(date +%s%N)
            RESPONSE=$(curl -s -w "%{http_code}" -X POST "$SSR_URL" \
                -H "Content-Type: application/json" \
                -d "$PAYLOAD" 2>&1)
            END=$(date +%s%N)

            HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
            if [ "$HTTP_CODE" = "200" ]; then
                SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
                DURATION=$((END - START))
                TOTAL_TIME=$((TOTAL_TIME + DURATION))
            fi

            # Show progress every 10 requests
            if [ $((i % 10)) -eq 0 ]; then
                echo -n "."
            fi
        done
        echo ""

        # Calculate averages
        AVG_TIME_NS=$((TOTAL_TIME / SUCCESS_COUNT))
        AVG_TIME_MS=$((AVG_TIME_NS / 1000000))
        REQUESTS_PER_SEC=$(echo "scale=2; 1000000000 / $AVG_TIME_NS" | bc)

        echo ""
        echo -e "${GREEN}Results:${NC}"
        echo "  Successful requests: $SUCCESS_COUNT/$TEST_REQUESTS"
        echo "  Average time per request: $AVG_TIME_MS ms"
        echo "  Requests per second: $REQUESTS_PER_SEC req/s"
    fi

    rm -f "$RESULTS_FILE"
}

# Main benchmark flow
main() {
    echo "📋 Benchmark Configuration:"
    echo "  Warmup requests: $WARMUP_REQUESTS"
    echo "  Test requests: $TEST_REQUESTS"
    echo "  Endpoint: $SSR_URL"
    echo ""

    # Check if vite is running
    if ! curl -s "$HEALTH_URL" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Vite dev server is not running${NC}"
        echo "Please start it with: cd assets && npm run dev"
        exit 1
    fi

    # Get current implementation info
    RESPONSE=$(curl -s "$HEALTH_URL")
    echo "Current implementation:"
    echo "  $RESPONSE"
    echo ""

    # Run benchmark for current implementation
    run_benchmark "Current Implementation"

    echo ""
    echo "✅ Benchmark complete!"
    echo ""
    echo "To benchmark the old vite-node implementation:"
    echo "  1. cd /Users/assim/Projects/nb/nb_vite"
    echo "  2. git checkout de52a22  # Previous commit before Module Runner"
    echo "  3. npm install"
    echo "  4. npm run build"
    echo "  5. Restart vite dev server"
    echo "  6. Run this benchmark again"
}

main
