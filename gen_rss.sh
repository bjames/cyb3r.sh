#!/bin/bash
# Generate RSS feed from markdown articles

echo "Generating RSS feed..."

# Get current date in RFC 822 format for lastBuildDate
BUILD_DATE=$(date "+%a, %d %b %Y %H:%M:%S GMT")

cat > site/rss.xml << RSS_HEADER
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>cyb3r.sh</title>
    <link>https://cyb3r.sh/</link>
    <description>Security, CTF writeups, and technical blog</description>
    <language>en-us</language>
    <lastBuildDate>${BUILD_DATE}</lastBuildDate>
    <generator>cyb3r.sh RSS Generator</generator>
RSS_HEADER

# Iterate through articles in reverse order (newest first)
for file in $(ls -r src/articles/*.md); do
    # Skip draft articles
    if [[ $file == *DRAFT* ]]; then
        continue
    fi

    title=$(sed -n '2p' $file | sed --expression='s/title:[[:space:]]//g')
    publication_date=$(sed -n '3p' $file | sed --expression='s/date:[[:space:]]//g')
    filename=$(basename $file .md)

    # URL-encode the filename for use in links (encode apostrophes and other special chars)
    filename_encoded=$(echo "$filename" | sed "s/'/%27/g; s/ /%20/g; s/,/%2C/g")

    # Convert YYYY-MM-DD to RFC 822 format (e.g., "Mon, 01 Jan 2025 00:00:00 GMT")
    rfc_date=$(date -d "$publication_date" "+%a, %d %b %Y 00:00:00 GMT" 2>/dev/null || echo "")

    # Escape XML special characters in title
    title_escaped=$(echo "$title" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g; s/'\''/\&apos;/g')

    # Extract first paragraph from markdown as description (skip frontmatter)
    description=$(sed -n '/^---$/,/^---$/d; /^[^#]/p' "$file" | head -n 1 | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g; s/'\''/\&apos;/g')

    # If no description found, use a default
    if [ -z "$description" ]; then
        description="Read more at cyb3r.sh"
    fi

    cat >> site/rss.xml << RSS_ITEM
    <item>
      <title>${title_escaped}</title>
      <link>https://cyb3r.sh/${filename_encoded}.html</link>
      <guid isPermaLink="true">https://cyb3r.sh/${filename_encoded}.html</guid>
      <pubDate>${rfc_date}</pubDate>
      <description>${description}</description>
    </item>
RSS_ITEM
done

cat >> site/rss.xml << 'RSS_FOOTER'
  </channel>
</rss>
RSS_FOOTER

echo "RSS feed generated at site/rss.xml"
