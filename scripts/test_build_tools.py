"""Run with: python3 -m unittest discover -s scripts -p 'test_*.py'"""
import json
from pathlib import Path
import tempfile
import unittest

from build_tools import build, discover, entry_assets, within


class ToolBuildTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        src = self.root / 'src'
        src.mkdir()
        (src / 'header.html').write_text('<nav id="shared-nav">original header</nav>')
        (src / 'footer.html').write_text('<footer>shared footer</footer>')
        (src / 'head.html').write_text('<meta name="test-shell" content="shared">')
        (src / 'tools.md').write_text('---\ntitle: tools\n---\n\nIntro stays editable.\n')
        self.tool = src / 'tools/example'
        (self.tool / 'assets/js').mkdir(parents=True)
        (self.tool / 'content.md').write_text('---\ntitle: Example\n---\n\nTool content.\n')
        (self.tool / 'assets/style.css').write_text('.example { color: red; }')
        (self.tool / 'assets/js/main.js').write_text('console.log("local")')
        self.spec = {'title': 'Example & tool', 'description': 'No uploads <ever>',
                     'output': 'example.html', 'content': 'content.md', 'assets': 'assets',
                     'styles': ['style.css'], 'scripts': ['js/main.js']}
        self.save_spec()

    def save_spec(self):
        (self.tool / 'tool.json').write_text(json.dumps(self.spec))

    def test_shared_shell_assets_listing_and_template_updates(self):
        build(self.root)
        page = (self.root / 'site/example.html').read_text()
        self.assertIn('original header', page)
        self.assertIn('shared footer', page)
        self.assertIn('class="tool-page tool-example"', page)
        self.assertIn('href="tools/example/style.css"', page)
        self.assertIn('src="tools/example/js/main.js"', page)
        self.assertTrue((self.root / 'site/tools/example/js/main.js').exists())
        listing = (self.root / 'site/tools.html').read_text()
        self.assertIn('Intro stays editable.', listing)
        self.assertIn('Example &amp; tool', listing)
        self.assertIn('&lt;ever&gt;', listing)
        (self.root / 'src/header.html').write_text('<nav>changed header</nav>')
        (self.root / 'site/tools/example/obsolete.js').write_text('old')
        build(self.root)
        self.assertIn('changed header', (self.root / 'site/example.html').read_text())
        self.assertFalse((self.root / 'site/tools/example/obsolete.js').exists())

    def test_reject_escape_and_output_collisions(self):
        with self.assertRaises(ValueError):
            within(self.tool, '../outside')
        for output in ('../escaped.html', 'tools.html'):
            self.spec['output'] = output
            self.save_spec()
            with self.assertRaises(ValueError):
                discover(self.root)

    def test_bundle_manifest_imported_css_and_module_entry(self):
        assets = self.tool / 'assets'
        (assets / '.vite').mkdir()
        (assets / 'shared.css').write_text('')
        manifest = {
            'src/main.js': {'file': 'js/main.js', 'css': ['style.css'], 'imports': ['shared']},
            'shared': {'file': 'shared.js', 'css': ['shared.css']},
        }
        (assets / '.vite/manifest.json').write_text(json.dumps(manifest))
        spec = dict(self.spec, scripts=[], bundle={'manifest': '.vite/manifest.json', 'entry': 'src/main.js'})
        styles, scripts = entry_assets(assets, spec)
        self.assertEqual(styles, ['style.css', 'shared.css'])
        self.assertEqual(scripts, [('js/main.js', True)])

    def test_missing_asset_fails(self):
        (self.tool / 'assets/style.css').unlink()
        with self.assertRaises(ValueError):
            entry_assets(self.tool / 'assets', self.spec)


if __name__ == '__main__':
    unittest.main()
