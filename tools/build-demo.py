#!/usr/bin/env python3
"""Generate docs/index.html: the published page wired to sample data.

GitHub Pages serves docs/, so this is the live demo. It is the real
src/index.html with three changes, none of which touch the app itself:

  * the viewport meta the deployed app gets from addMetaTag()
  * tools/demo-fixture.js in place of the Apps Script bridge
  * a banner saying the data is fake

Run after editing src/index.html:  python3 tools/build-demo.py
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

BANNER = """
  <div class="demo-note">
    Demo with sample data — no Google account needed, and no calendar is
    read. <a href="https://github.com/TakahiroGitLab/gcal-entry-log">Source
    and setup on GitHub</a>, and a
    <a href="https://zenn.dev/takagit/articles/gcal-entry-log-apps-script">write-up of how it works</a> (Japanese).
  </div>
"""

BANNER_CSS = """
    .demo-note {
      background: var(--glass);

      -webkit-backdrop-filter: var(--blur);
      backdrop-filter: var(--blur);

      border: 1px solid var(--glass-edge);

      border-radius: 14px;

      padding: 11px 15px;

      margin-bottom: 20px;

      font-size: 13px;

      line-height: 1.6;

      color: var(--ink-soft);

      box-shadow: var(--shadow);
    }


    .demo-note a {
      color: var(--accent);
    }
"""


def main() -> int:
    src = (ROOT / "src" / "index.html").read_text()
    fixture = (ROOT / "tools" / "demo-fixture.js").read_text()

    def sub(text, old, new, what):
        if text.count(old) != 1:
            print(f"error: expected exactly one {what}", file=sys.stderr)
            raise SystemExit(1)
        return text.replace(old, new, 1)

    out = sub(src, '  <meta charset="UTF-8">',
              '  <meta charset="UTF-8">\n\n'
              '  <meta name="viewport" content="width=device-width, initial-scale=1">',
              "charset meta")

    out = sub(out, "  </style>", BANNER_CSS + "\n  </style>", "style close")
    out = sub(out, '<div class="container">',
              '<div class="container">\n' + BANNER, "container open")
    out = sub(out, "<script>",
              "<script>\n" + fixture + "</script>\n\n\n<script>", "first script tag")

    dest = ROOT / "docs" / "index.html"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(out)
    print(f"wrote {dest.relative_to(ROOT)} ({len(out):,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
