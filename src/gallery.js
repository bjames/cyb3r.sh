/* Turns every `::: gallery` fenced div into an advanceable slideshow.
   Pandoc renders that div as <div class="gallery"> full of <figure> elements,
   so there is nothing to configure per article -- write the div, get slides. */
(function () {
    'use strict';

    var lightbox = null;
    var galleries = [];

    function button(label, glyph) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'gallery-btn';
        b.setAttribute('aria-label', label);
        b.textContent = glyph;
        return b;
    }

    function buildLightbox() {
        var box = document.createElement('div');
        box.className = 'gallery-lightbox';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        box.setAttribute('aria-label', 'Image viewer');

        var close = button('Close viewer', '×');
        close.classList.add('gallery-close');

        var img = document.createElement('img');
        var cap = document.createElement('figcaption');

        var controls = document.createElement('div');
        controls.className = 'gallery-controls';
        var prev = button('Previous image', '‹');
        var next = button('Next image', '›');
        var counter = document.createElement('span');
        counter.className = 'gallery-counter';
        counter.setAttribute('aria-live', 'polite');
        controls.appendChild(prev);
        controls.appendChild(counter);
        controls.appendChild(next);

        box.appendChild(close);
        box.appendChild(img);
        box.appendChild(cap);
        box.appendChild(controls);
        document.body.appendChild(box);

        var api = {
            el: box, img: img, cap: cap, counter: counter,
            owner: null, lastFocus: null,
            open: function (gallery) {
                api.owner = gallery;
                api.lastFocus = document.activeElement;
                box.classList.add('is-open');
                api.paint();
                close.focus();
            },
            close: function () {
                box.classList.remove('is-open');
                api.owner = null;
                if (api.lastFocus) { api.lastFocus.focus(); }
            },
            isOpen: function () { return box.classList.contains('is-open'); },
            paint: function () {
                if (!api.owner) { return; }
                var s = api.owner.state;
                var slide = s.slides[s.index];
                var source = slide.querySelector('img');
                img.src = source.currentSrc || source.src;
                img.alt = source.alt || '';
                cap.textContent = source.alt || '';
                counter.textContent = (s.index + 1) + ' / ' + s.slides.length;
            }
        };

        close.addEventListener('click', api.close);
        img.addEventListener('click', api.close);
        box.addEventListener('click', function (e) {
            if (e.target === box) { api.close(); }
        });
        prev.addEventListener('click', function () {
            if (api.owner) { api.owner.step(-1); }
        });
        next.addEventListener('click', function () {
            if (api.owner) { api.owner.step(1); }
        });

        return api;
    }

    /* Pandoc only emits a <figure> when an image sits alone in its own
       paragraph. Images written on consecutive lines collapse into a single
       <p> of inline <img>, so build the missing figures ourselves rather than
       making blank lines load-bearing. */
    function collectSlides(gallery) {
        var figures = Array.prototype.filter.call(gallery.children, function (el) {
            return el.tagName === 'FIGURE';
        });
        if (figures.length >= 2) { return figures; }

        var imgs = gallery.querySelectorAll('img');
        if (imgs.length < 2) { return figures; }

        return Array.prototype.map.call(imgs, function (img) {
            var fig = img.closest('figure');
            if (fig && gallery.contains(fig)) { return fig; }

            fig = document.createElement('figure');
            img.parentNode.insertBefore(fig, img);
            fig.appendChild(img);
            if (img.alt) {
                var cap = document.createElement('figcaption');
                cap.setAttribute('aria-hidden', 'true');
                cap.textContent = img.alt;
                fig.appendChild(cap);
            }
            return fig;
        });
    }

    function initGallery(gallery) {
        var slides = collectSlides(gallery);
        if (slides.length < 2) { return; }

        var frame = document.createElement('div');
        frame.className = 'gallery-frame';
        slides.forEach(function (s) { frame.appendChild(s); });

        // Drop the wrapper paragraphs the figures were just lifted out of.
        Array.prototype.slice.call(gallery.children).forEach(function (el) {
            if (!el.children.length && !el.textContent.trim()) {
                gallery.removeChild(el);
            }
        });

        gallery.appendChild(frame);

        var controls = document.createElement('div');
        controls.className = 'gallery-controls';
        var prev = button('Previous image', '‹');
        var next = button('Next image', '›');
        var counter = document.createElement('span');
        counter.className = 'gallery-counter';
        counter.setAttribute('aria-live', 'polite');
        var dots = document.createElement('div');
        dots.className = 'gallery-dots';

        var api = { state: { slides: slides, index: 0 } };

        var dotEls = slides.map(function (_, i) {
            var d = document.createElement('button');
            d.type = 'button';
            d.className = 'gallery-dot';
            d.setAttribute('aria-label', 'Go to image ' + (i + 1));
            d.addEventListener('click', function () { api.show(i); });
            dots.appendChild(d);
            return d;
        });

        controls.appendChild(prev);
        controls.appendChild(dots);
        controls.appendChild(counter);
        controls.appendChild(next);
        gallery.appendChild(controls);

        api.show = function (i) {
            var n = slides.length;
            api.state.index = ((i % n) + n) % n;
            slides.forEach(function (s, j) {
                var on = j === api.state.index;
                s.classList.toggle('is-active', on);
                s.setAttribute('aria-hidden', on ? 'false' : 'true');
            });
            dotEls.forEach(function (d, j) {
                var on = j === api.state.index;
                d.classList.toggle('is-active', on);
                if (on) { d.setAttribute('aria-current', 'true'); }
                else { d.removeAttribute('aria-current'); }
            });
            counter.textContent = (api.state.index + 1) + ' / ' + n;
            if (lightbox && lightbox.owner === api) { lightbox.paint(); }
        };
        api.step = function (delta) { api.show(api.state.index + delta); };

        prev.addEventListener('click', function () { api.step(-1); });
        next.addEventListener('click', function () { api.step(1); });

        gallery.tabIndex = 0;
        gallery.setAttribute('role', 'group');
        gallery.setAttribute('aria-roledescription', 'image gallery');
        gallery.addEventListener('keydown', function (e) {
            if (lightbox && lightbox.isOpen()) { return; }
            if (e.key === 'ArrowLeft') { api.step(-1); e.preventDefault(); }
            else if (e.key === 'ArrowRight') { api.step(1); e.preventDefault(); }
        });

        // Swipe on touch screens.
        var startX = null;
        frame.addEventListener('touchstart', function (e) {
            startX = e.changedTouches[0].clientX;
        }, { passive: true });
        frame.addEventListener('touchend', function (e) {
            if (startX === null) { return; }
            var dx = e.changedTouches[0].clientX - startX;
            startX = null;
            if (Math.abs(dx) > 40) { api.step(dx < 0 ? 1 : -1); }
        }, { passive: true });

        frame.addEventListener('click', function (e) {
            if (e.target.tagName !== 'IMG') { return; }
            if (!lightbox) { lightbox = buildLightbox(); }
            lightbox.open(api);
        });

        gallery.classList.add('gallery--ready');
        api.show(0);
        galleries.push(api);
    }

    function init() {
        Array.prototype.forEach.call(
            document.querySelectorAll('.gallery'), initGallery
        );

        document.addEventListener('keydown', function (e) {
            if (!lightbox || !lightbox.isOpen()) { return; }
            if (e.key === 'Escape') { lightbox.close(); }
            else if (e.key === 'ArrowLeft') { lightbox.owner.step(-1); }
            else if (e.key === 'ArrowRight') { lightbox.owner.step(1); }
            else { return; }
            e.preventDefault();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
