rm -rf site
mkdir -p site
mkdir -p site/media
tmp_index=$(mktemp /tmp/XXXXXXXXX.md)
trap "rm -f $tmp_indx" EXIT
cp src/index.md $tmp_index
# we need to iterate over the files in reverse order to have the latest articles on top
for file in $(ls -r src/articles/*.md); do
    title=$(sed -n '2p' $file | sed --expression='s/title:[[:space:]]//g')
    publication_date=$(sed -n '3p' $file | sed --expression='s/date:[[:space:]]//g')
    echo "[$publication_date - $title]($(basename $file .md).html)" >> $tmp_index
    echo "" >> $tmp_index
    # handle pages with table of contents
    grep "generate_toc: true" $file && 
    pandoc --toc $file -o site/$(basename $file .md).html --standalone --css style.css --include-before-body src/header.html --include-after-body src/footer.html -H src/head.html ||
    pandoc $file -o site/$(basename $file .md).html --standalone --css style.css --include-before-body src/header.html --include-after-body src/footer.html -H src/head.html
done
cp -a src/media/. site/media
cp -a src/articles/media/. site/media
cp -a src/favicon/. site
pandoc $tmp_index -o site/index.html --standalone --css style.css --include-before-body src/header.html --include-after-body src/footer.html -H src/head.html
pandoc src/about.md -o site/about.html --standalone --css style.css --include-before-body src/header.html --include-after-body src/footer.html -H src/head.html
pandoc src/404.md -o site/404.html --standalone --css style.css --include-before-body src/header.html --include-after-body src/footer.html -H src/head.html
cp src/style.css site/style.css