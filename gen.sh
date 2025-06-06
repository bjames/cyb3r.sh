# if the script is run with the argument "clean", remove the site directory
if [[ $1 == "clean" ]]; then
    echo "Cleaning site directory..."
    rm -rf site
fi
mkdir -p site
mkdir -p site/media
tmp_index=$(mktemp /tmp/XXXXXXXXX.md)
trap "rm -f $tmp_indx" EXIT
cp src/index.md $tmp_index
updated=false
# we need to iterate over the files in reverse order to have the latest articles on top
for file in $(ls -r src/articles/*.md); do
    title=$(sed -n '2p' $file | sed --expression='s/title:[[:space:]]//g')
    publication_date=$(sed -n '3p' $file | sed --expression='s/date:[[:space:]]//g')
    # if DRAFT is in filename, don't add to index
    if [[ $file != *DRAFT* ]]; then
        echo "[$publication_date - $title]($(basename $file .md).html)" >> $tmp_index
        echo "" >> $tmp_index
    fi
    # skip files that have not been modified since last generation
    if [[ $file -ot site/index.html ]]; then
        echo "$file has not been modified, skipping..."
        continue
    else
        echo "Generating HTML for $file..."
    fi
    updated=true
    # handle pages with table of contents
    grep "generate_toc: true" $file && 
    pandoc --toc $file -o site/$(basename $file .md).html --standalone --css style.css --include-before-body src/header.html --include-after-body src/footer.html -H src/head.html ||
    pandoc $file -o site/$(basename $file .md).html --standalone --css style.css --include-before-body src/header.html --include-after-body src/footer.html -H src/head.html
done
cp -au src/media/. site/media
cp -au src/articles/media/. site/media
cp -au src/favicon/. site
cp -u src/style.css site/style.css

if [ "$updated" = true ]; then
    echo "Site has been updated with new articles. Generating index..."
    pandoc $tmp_index -o site/index.html --standalone --css style.css --include-before-body src/header.html --include-after-body src/footer.html -H src/head.html
else
    echo "No new articles found, skipping index generation."
fi

if [ src/about.md -ot site/about.html ]; then
    echo "About page has not been modified since last generation, skipping..."
else
    echo "Generating about page..."
    pandoc src/about.md -o site/about.html --standalone --css style.css --include-before-body src/header.html --include-after-body src/footer.html -H src/head.html
fi

if [ src/404.md -ot site/404.html ]; then
    echo "404 page has not been modified since last generation, skipping..."
else
    echo "Generating 404 page..."
    pandoc src/404.md -o site/404.html --standalone --css style.css --include-before-body src/header.html --include-after-body src/footer.html -H src/head.html
fi