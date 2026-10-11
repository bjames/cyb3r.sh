#!/usr/bin/env python3
"""Build manifest-defined client-side tools into the existing Pandoc site."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def within(root, relative):
    """Resolve a manifest path without allowing it to escape its tool directory."""
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError(f"Path escapes tool directory: {relative}")
    return path


def discover(root):
    tools = []
    outputs = {"index.html", "tools.html", "about.html", "404.html"}
    outputs.update(p.stem + '.html' for p in (root / 'src/articles').glob('*.md'))
    for manifest in sorted((root / 'src/tools').glob('*/tool.json')):
        spec = json.loads(manifest.read_text())
        slug = manifest.parent.name
        if not re.fullmatch(r'[a-z0-9][a-z0-9-]*', slug):
            raise ValueError(f"Invalid tool directory name: {slug}")
        for key in ('title', 'description', 'content', 'assets', 'output'):
            if not isinstance(spec.get(key), str) or not spec[key]:
                raise ValueError(f"{manifest}: missing string field {key}")
        output = spec['output']
        if not re.fullmatch(r'[a-z0-9][a-z0-9-]*\.html', output) or output in outputs:
            raise ValueError(f"Invalid or duplicate output: {output}")
        outputs.add(output)
        for key in ('content', 'assets', 'working_directory'):
            if key in spec:
                within(manifest.parent, spec[key])
        for key in ('install', 'build'):
            if key in spec and (not isinstance(spec[key], list) or not spec[key]
                                or not all(isinstance(v, str) for v in spec[key])):
                raise ValueError(f"{key} must be a nonempty command argument array")
        tools.append((slug, manifest.parent, spec))
    return tools


def build_assets(directory, spec):
    cwd = within(directory, spec.get('working_directory', '.'))
    if 'install' in spec:
        # Reinstall on lockfile changes, not on every site generation.
        lock = cwd / 'package-lock.json'
        digest = hashlib.sha256(lock.read_bytes() + (cwd / 'package.json').read_bytes()).hexdigest()
        stamp = cwd / 'node_modules/.tool-dependencies.sha256'
        if not stamp.exists() or stamp.read_text() != digest:
            subprocess.run(spec['install'], cwd=cwd, check=True)
            stamp.parent.mkdir(parents=True, exist_ok=True)
            stamp.write_text(digest)
    if 'build' in spec:
        subprocess.run(spec['build'], cwd=cwd, check=True)
    assets = within(directory, spec['assets'])
    if not assets.is_dir():
        raise ValueError(f"Missing asset directory: {assets}")
    return assets


def entry_assets(assets, spec):
    styles = list(spec.get('styles', []))
    scripts = [(p, False) for p in spec.get('scripts', [])]
    if 'bundle' in spec:
        bundle = spec['bundle']
        manifest = json.loads(within(assets, bundle['manifest']).read_text())
        entry = manifest[bundle['entry']]
        seen = set()

        def collect(key):
            if key in seen:
                return
            seen.add(key)
            chunk = manifest[key]
            for dependency in chunk.get('imports', []):
                collect(dependency)
            styles.extend(chunk.get('css', []))

        collect(bundle['entry'])
        scripts.append((entry['file'], True))
    styles = list(dict.fromkeys(styles))
    for path in styles + [p for p, _ in scripts]:
        if not within(assets, path).is_file():
            raise ValueError(f"Missing declared asset: {path}")
    return styles, scripts


def render(root, content, output, styles=(), scripts='', body_class=None):
    # Always render tools: shared head/header/footer changes must take effect too.
    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / 'content.md'
        target = Path(tmp) / 'page.html'
        source.write_text(content + '\n\n' + scripts + '\n')
        command = ['pandoc', str(source), '-o', str(target), '--standalone', '--css', 'style.css',
                   '--include-before-body', str(root / 'src/header.html'),
                   '--include-after-body', str(root / 'src/footer.html'),
                   '-H', str(root / 'src/head.html')]
        for style in styles:
            command.extend(['--css', style])
        subprocess.run(command, cwd=root, check=True)
        page = target.read_text()
        if body_class:
            page = page.replace('<body>', f'<body class="{html.escape(body_class, quote=True)}">', 1)
        output.write_text(page)


def build(root):
    tools = discover(root)
    site = root / 'site'
    site.mkdir(exist_ok=True)
    listing = []
    for slug, directory, spec in tools:
        print(f"Building tool: {slug}", flush=True)
        assets = build_assets(directory, spec)
        styles, scripts = entry_assets(assets, spec)
        asset_url = f'tools/{slug}/'
        destination = site / 'tools' / slug
        if destination.exists():
            shutil.rmtree(destination)
        shutil.copytree(assets, destination)
        # Vite's metadata is build-only; never needed by the browser.
        shutil.rmtree(destination / '.vite', ignore_errors=True)
        script_tags = []
        for path, module in scripts:
            type_attribute = ' type="module"' if module else ''
            url = html.escape(asset_url + path, quote=True)
            script_tags.append(f'<script{type_attribute} src="{url}"></script>')
        script_html = '\n'.join(script_tags)
        render(root, within(directory, spec['content']).read_text(), site / spec['output'],
               [asset_url + p for p in styles], script_html, 'tool-page tool-' + slug)
        listing.append(f'<p><a href="{html.escape(spec["output"], quote=True)}">'
                       f'{html.escape(spec["title"])}</a> - {html.escape(spec["description"])}</p>')
    render(root, (root / 'src/tools.md').read_text() + '\n\n' + '\n'.join(listing), site / 'tools.html')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    args = parser.parse_args()
    try:
        build(args.root.resolve())
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'Tool build failed: {error}\n')


if __name__ == '__main__':
    main()
