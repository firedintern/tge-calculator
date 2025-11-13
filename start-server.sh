#!/bin/bash

# TGE Calculator - Local Demo Server
# This script starts a local web server for testing

PORT=8080
URL="http://localhost:$PORT"

echo "=========================================="
echo "  TGE Calculator - Local Demo Server"
echo "=========================================="
echo ""

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port $PORT is already in use!"
    echo ""
    echo "Server is likely already running at:"
    echo "👉 $URL"
    echo ""
    echo "Open the URL above in your browser to test."
    echo ""
    exit 0
fi

# Start the server
echo "🚀 Starting local server on port $PORT..."
echo ""

python3 -m http.server $PORT &
SERVER_PID=$!

sleep 2

# Check if server started successfully
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "✅ Server started successfully!"
    echo ""
    echo "=========================================="
    echo "  📱 Access the calculator at:"
    echo "  👉 $URL"
    echo "=========================================="
    echo ""
    echo "📋 Test Checklist:"
    echo "  □ Light/Dark mode toggle (top-right)"
    echo "  □ Fill in required fields and calculate"
    echo "  □ Check Risk Analysis breakdown bars"
    echo "  □ Test Advanced breakdown section"
    echo "  □ Try 'Compare' to save calculations"
    echo "  □ Test 'Share' and 'X Post' buttons"
    echo "  □ Test 'Export' functionality"
    echo "  □ Hover over ℹ️ tooltips"
    echo "  □ Test on mobile (resize browser)"
    echo ""
    echo "🛑 To stop the server:"
    echo "   kill $SERVER_PID"
    echo "   or press Ctrl+C"
    echo ""

    # Try to open in default browser (macOS)
    if command -v open &> /dev/null; then
        echo "🌐 Opening in browser..."
        open "$URL"
    fi

    # Keep script running
    wait $SERVER_PID
else
    echo "❌ Failed to start server!"
    exit 1
fi
