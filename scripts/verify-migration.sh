#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Turborepo Migration Verification Script"
echo "=========================================="
echo ""

# Check 1: Verify turbo.json exists
echo -n "✓ Checking turbo.json exists... "
if [ -f "turbo.json" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}MISSING${NC}"
    exit 1
fi

# Check 2: Verify turbo in devDependencies
echo -n "✓ Checking turbo in package.json... "
if grep -q '"turbo":' package.json; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}MISSING${NC}"
fi

# Check 3: Verify nx.json is removed
echo -n "✓ Checking nx.json is removed... "
if [ ! -f "nx.json" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}STILL EXISTS${NC}"
fi

# Check 4: Verify Nx dependencies are removed from package.json
echo -n "✓ Checking Nx dependencies removed... "
if ! grep -q '"@nx/' package.json && ! grep -q '"nx"' package.json | grep -v turbo; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}SOME NX DEPS REMAIN${NC}"
fi

# Check 5: Verify .gitignore updated
echo -n "✓ Checking .gitignore updated for .turbo... "
if grep -q "\.turbo" .gitignore; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}MISSING${NC}"
fi

# Check 6: Verify all apps have names in package.json
echo -n "✓ Checking app package names... "
missing_names=0
for app_pkg in apps/*/package.json; do
    if ! grep -q '"name":' "$app_pkg"; then
        echo -e "${RED}MISSING in $app_pkg${NC}"
        missing_names=$((missing_names + 1))
    fi
done
if [ $missing_names -eq 0 ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}SOME MISSING${NC}"
fi

# Check 7: Verify pnpm-workspace.yaml is valid
echo -n "✓ Checking pnpm-workspace.yaml... "
if [ -f "pnpm-workspace.yaml" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}MISSING${NC}"
fi

# Check 8: Verify turbo.json has required structure
echo -n "✓ Checking turbo.json structure... "
if grep -q '"tasks"' turbo.json && grep -q '"build"' turbo.json; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}INVALID STRUCTURE${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Migration verification complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Run: pnpm install"
echo "2. Run: pnpm turbo run build"
echo "3. Run: pnpm turbo run lint"
echo "4. Test your specific commands"
echo ""
