#!/bin/bash

# Generate short hashes of file contents
css_hash=$(sha256sum style.css | cut -c1-8)
js_hash=$(sha256sum balls.js | cut -c1-8)

# Update references in index.html
sed -i "s/style\.css\(?v=[a-f0-9]*\)\?/style.css?v=$css_hash/" index.html
sed -i "s/balls\.js\(?v=[a-f0-9]*\)\?/balls.js?v=$js_hash/" index.html

echo "Updated hashes:"
echo "  style.css?v=$css_hash"
echo "  balls.js?v=$js_hash"
