from pathlib import Path
import re, zipfile, shutil

root = Path(__file__).resolve().parents[1]
out = root / 'artifacts'
out.mkdir(exist_ok=True)
index = (root / 'preview/index.html').read_text()
script = next((root / 'preview/assets').glob('*.js')).read_text()
style = next((root / 'preview/assets').glob('*.css')).read_text()
index = re.sub(r'<script\b[^>]*src="[^"]+"[^>]*></script>', lambda _: '<script type="module">' + script.replace('</script', '<\\/script') + '</script>', index)
index = re.sub(r'<link\b[^>]*(?:rel="stylesheet"|rel="modulepreload")[^>]*>', '', index)
index = index.replace('</head>', '<style>' + style + '</style></head>')
(out / 'MINING_GAME_PLAY.html').write_text(index)
shutil.copy(root / 'node_modules/phaser/LICENSE.md', root / 'PHASER_LICENSE.md')
with zipfile.ZipFile(out / 'MINING_GAME_YANDEX.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for path in sorted((root / 'dist').rglob('*')):
        if path.is_file(): z.write(path, path.relative_to(root / 'dist'))
with zipfile.ZipFile(out / 'MINING_GAME_SOURCE.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for path in sorted(root.rglob('*')):
        if not path.is_file() or any(part in ('node_modules', 'dist', 'preview', 'test-results', 'artifacts', '__pycache__') for part in path.relative_to(root).parts): continue
        z.write(path, Path('mining-game') / path.relative_to(root))
print('\n'.join(f'{p.name}: {p.stat().st_size} bytes' for p in out.glob('MINING_GAME_*')))
