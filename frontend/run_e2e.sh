#!/bin/bash
pkill -f vite || true
VITE_API_BASE_URL=http://localhost:3000/api npm run dev > vite.log 2>&1 &
VITE_PID=$!
echo "Vite PID is $VITE_PID"
sleep 5
npm run test:e2e
TEST_EXIT_CODE=$?
echo "Test exit code is $TEST_EXIT_CODE"
pkill -f vite || true
kill $VITE_PID || true
exit $TEST_EXIT_CODE
