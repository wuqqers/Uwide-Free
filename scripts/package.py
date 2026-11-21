from pathlib import Path
import hashlib, json, zipfile
root = Path(__file__).resolve().parent.parent
source = root / "extension"
manifest = json.loads((source / "manifest.json").read_text(encoding="utf-8"))
required = ["manifest.json", "LICENSE", "PRIVACY.html", "options.html", manifest["background"]["service_worker"]]
required += list(manifest["icons"].values())
required += [file for entry in manifest["content_scripts"] for file in entry.get("js", [])]
for file in required:
    if not (source / file).is_file():
        raise SystemExit("Missing file: " + file)
output = root / "dist"
output.mkdir(exist_ok=True)
archive = output / ("Uwide-Free-Chromium-" + manifest["version"] + ".zip")
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
    for file in sorted(source.iterdir()):
        if file.is_file():
            z.write(file, file.name)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert json.loads(z.read("manifest.json"))["version"] == manifest["version"]
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(archive.with_suffix(".zip.sha256")).write_text(digest + "  " + archive.name + "\n", encoding="utf-8")
print(archive)
