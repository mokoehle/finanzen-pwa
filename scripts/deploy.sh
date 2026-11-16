#!/bin/sh
# Builds the app and publishes dist/ to the gh-pages branch (served by GitHub Pages).
set -e
REMOTE=$(git remote get-url origin)
NAME=$(git config user.name)
EMAIL=$(git config user.email)
npm run build
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="$NAME" -c user.email="$EMAIL" commit -q -m "Deploy"
git push -f "$REMOTE" gh-pages
rm -rf .git
