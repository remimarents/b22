#!/bin/bash
echo "🔄 Henter fra webserver (web)..."
git fetch web

echo "📦 Sjekker ut endringer fra web/main..."
git checkout web/main -- .

echo "✅ Ferdig! Husk å committe og pushe om ønskelig:"
echo "   git add . && git commit -m 'Synk fra produksjon' && git push origin main"
