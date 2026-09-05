# -*- coding: utf-8 -*-
"""src/ から index.html を組み立てる。

なぜビルドするか:
  配信する index.html は1ファイルのままにしたい（オフライン動作・ダブルクリックで開ける・
  Service Worker のキャッシュが単純）。一方で編集するときは機能ごとに分かれていたほうが安全。
  そこで「編集は src/、配信は index.html」に分け、このスクリプトで結合する。

新しい月を追加する手順:
  1. src/data/2026-09.js をコピーして src/data/2026-10.js を作る
  2. key / label / roomSuffix / ledger / contacts を差し替える
  3. 「ビルド.command」をダブルクリック（または python3 build.py）
  index.html を直接いじる必要はない。src/data/*.js は名前順に読み込まれる。

使い方:
  python3 build.py          # index.html を書き出す
  python3 build.py --check  # 書き出さずに、現在の index.html と一致するかだけ見る
"""
import os, sys, glob

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(ROOT, "index.html")


def read(rel):
    with open(os.path.join(SRC, rel), encoding="utf-8") as f:
        return f.read().rstrip("\n")


def js_chunk(path):
    """結合後もどのソースから来たか追えるように、1行だけ目印を入れる"""
    rel = os.path.relpath(path, ROOT)
    return "/* ---- %s ---- */\n%s" % (rel, open(path, encoding="utf-8").read().rstrip("\n"))


def build():
    js_files = sorted(glob.glob(os.path.join(SRC, "js", "*.js")))
    data_files = sorted(glob.glob(os.path.join(SRC, "data", "*.js")))
    if not js_files:
        sys.exit("src/js/*.js が見つかりません")
    if not data_files:
        sys.exit("src/data/*.js が見つかりません")

    # 月データは registerMonth() を呼ぶので、それを定義する 00-month-registry.js の直後に置く
    ordered = []
    for p in js_files:
        ordered.append(p)
        if os.path.basename(p).startswith("00-"):
            ordered.extend(data_files)
    if not any(p in ordered for p in data_files):
        sys.exit("src/js/00-*.js が無いため月データの差し込み位置を決められません")

    parts = [
        read("head.html"),
        "<style>",
        read("styles.css"),
        "</style>",
        read("body.html"),
        "<script>",
        "\n".join(js_chunk(p) for p in ordered),
        "</script>",
        "",
        "<!-- ===== Firebase同期（設定するとチームで入力共有） ===== -->",
        '<script type="module">',
        read("module/95-firebase-sync.js"),
        "</script>",
        read("foot.html"),
    ]
    return "\n".join(parts) + "\n"


if __name__ == "__main__":
    html = build()
    if "--check" in sys.argv:
        cur = open(OUT, encoding="utf-8").read()
        print("一致" if cur == html else "不一致（ビルドが必要）")
        sys.exit(0 if cur == html else 1)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print("index.html を書き出しました（%d 文字）" % len(html))
