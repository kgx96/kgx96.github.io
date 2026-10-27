#!/usr/bin/env python3
# KGX's Dev Library - Copyright (c) KGX PRODUCTIONS 2026. All rights reserved.
# Site layout guard (run by .github/workflows/site-guard.yml after every push).
#
# GitHub's web upload can drop folder paths: the toolbox site's files then land
# at the repository root, and its index.html, search.json, sitemap.xml...
# replace the Dev Library's (Oct 27, 2026). site-manifest.json (written by the
# site build, uploaded with every website update) says which file belongs where
# (path -> git blob id). This puts misplaced files back:
#   1. A manifest path gets its own file when that exact file was uploaded to
#      a wrong place (another folder, "name (1).html"), or when the path now
#      holds a file the manifest places somewhere else: from wherever it was
#      uploaded to, or else from the repository's history.
#   2. A file that is not in the manifest but is a copy of a manifest file (the
#      flattened toolbox pages at the root, "index (1).html") is removed.
# Files the manifest does not know (your own edits, new pages) are never
# touched. Only the root and the toolbox folder are checked.
#   python3 site_guard.py [repo_dir]   (prints what it did; GITHUB_OUTPUT: changed)
import hashlib, json, os, subprocess, sys

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
MANIFEST = "site-manifest.json"
FOLDERS = ("garrysmod-kgxs-admin-toolbox",)


def blob_id(data):
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()


def read(rel):
    with open(os.path.join(ROOT, rel), "rb") as f:
        return f.read()


def checked_files():
    """Every file at the root and in the site folders: {path: blob id}."""
    out = {}
    for name in os.listdir(ROOT):
        p = os.path.join(ROOT, name)
        if os.path.isfile(p):
            out[name] = blob_id(read(name))
    for folder in FOLDERS:
        base = os.path.join(ROOT, folder)
        for d, _, files in os.walk(base):
            for name in files:
                rel = os.path.relpath(os.path.join(d, name), ROOT).replace(os.sep, "/")
                out[rel] = blob_id(read(rel))
    return out


def from_history(blob):
    try:
        return subprocess.run(["git", "-C", ROOT, "cat-file", "blob", blob], check=True, capture_output=True).stdout
    except Exception:
        return None


def git(*args):
    r = subprocess.run(["git", "-C", ROOT] + list(args), capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else ""


def uploaded_after_last_change(path, blob):
    """The file was uploaded (it is in the history, put somewhere: two files of
    one name at the root overwrite each other) no earlier than path last
    changed. A later edit of path is kept."""
    first = git("log", "--format=%H", "--find-object=" + blob, "--reverse")
    first = first.split("\n")[0] if first else ""
    if not first:
        return False
    last = git("log", "-1", "--format=%H", "--", path)
    if not last or last == first:
        return True
    return subprocess.run(["git", "-C", ROOT, "merge-base", "--is-ancestor", last, first]).returncode == 0


def find_manifest():
    """The manifest: at the root, or uploaded into a site folder by mistake
    (the newest upload wins). Put back at the root."""
    found = [p for p in [MANIFEST] + [f + "/" + MANIFEST for f in FOLDERS] if os.path.isfile(os.path.join(ROOT, p))]
    if not found:
        return None, False
    def newest(p):
        t = git("log", "-1", "--format=%ct", "--", p)
        return int(t) if t else 0
    best = max(found, key=newest)
    data, moved = read(best), False
    for p in found:
        if p != MANIFEST:
            os.remove(os.path.join(ROOT, p))
            moved = True
    if best != MANIFEST or not os.path.isfile(os.path.join(ROOT, MANIFEST)):
        moved = True
    with open(os.path.join(ROOT, MANIFEST), "wb") as f:
        f.write(data)
    return data, moved


def main():
    data, moved = find_manifest()
    if data is None:
        print("no " + MANIFEST + ": nothing to check")
        return False
    want = json.loads(data.decode("utf-8"))["files"]  # {path: blob id}
    want.pop(MANIFEST, None)
    have = checked_files()
    by_blob = {}  # blob -> current paths holding it (before any change)
    for path, blob in have.items():
        by_blob.setdefault(blob, []).append(path)
    owners = {}  # blob -> manifest paths it belongs at
    for path, blob in want.items():
        owners.setdefault(blob, set()).add(path)

    writes, report = {}, []
    for path, blob in sorted(want.items()):
        cur = have.get(path)
        if cur == blob:
            continue
        # its own file sits elsewhere (uploaded to the wrong folder, or renamed
        # "name (1).html"), or this path holds a file that belongs elsewhere
        elsewhere = [p for p in by_blob.get(blob, []) if p != path]
        stray_upload = any(p not in want for p in elsewhere)
        misplaced = cur is not None and cur in owners and path not in owners[cur]
        missing_but_uploaded = cur is None and bool(elsewhere)
        if not (stray_upload or misplaced or missing_but_uploaded or uploaded_after_last_change(path, blob)):
            continue  # an edit the manifest does not know, or not uploaded yet: left alone
        src = next((p for p in elsewhere if p not in want), None) or (elsewhere[0] if elsewhere else None)
        data = read(src) if src else from_history(blob)
        if data is None:
            report.append("cannot restore %s yet (its file is not uploaded)" % path)
            continue
        writes[path] = data
        report.append("restored %s%s" % (path, (" (from " + src + ")") if src else " (from history)"))

    removes = []
    for path, blob in sorted(have.items()):
        if path in want or path == MANIFEST or blob not in owners:
            continue
        # a copy of a manifest file in the wrong place: removed once every
        # place it belongs holds it
        if all((writes.get(p) is not None and blob_id(writes[p]) == blob) or have.get(p) == blob for p in owners[blob]):
            removes.append(path)
            report.append("removed %s (belongs at %s)" % (path, ", ".join(sorted(owners[blob]))))

    for path, data in writes.items():
        full = os.path.join(ROOT, path)
        os.makedirs(os.path.dirname(full) or ROOT, exist_ok=True)
        with open(full, "wb") as f:
            f.write(data)
    for path in removes:
        os.remove(os.path.join(ROOT, path))

    if moved:
        report.insert(0, "put " + MANIFEST + " back at the repository root")
    print("\n".join(report) if report else "layout OK: every file is where it belongs")
    with open(os.path.join(os.environ.get("RUNNER_TEMP", "/tmp"), "site_guard_report.txt"), "w") as f:
        f.write("\n".join(report) + "\n")
    return bool(writes or removes or moved)


if __name__ == "__main__":
    changed = main()
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a") as f:
            f.write("changed=%s\n" % ("true" if changed else "false"))
