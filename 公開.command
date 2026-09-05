#!/bin/bash
# ダブルクリックで GitHub Pages に公開するスクリプト
# 手動アップロード（ドラッグ＆ドロップ）不要。ファイル落ちも防ぐ。
cd "$(dirname "$0")" || exit 1

echo "=============================="
echo " 首都圏イベント管理簿 公開ツール"
echo "=============================="
echo ""

# src/ から index.html を組み立て直す（ビルド忘れで古い内容を公開しないように）
echo "▼ ビルド中..."
if ! python3 build.py; then
  echo ""
  echo "⚠ ビルドに失敗しました。公開を中止します。"
  read -n 1 -s -r -p "このウィンドウは閉じてOKです（何かキーを押す）"
  exit 1
fi
echo ""

# 変更があるか確認
if [ -z "$(git status --porcelain)" ]; then
  echo "変更なし。公開するものがありません。"
  echo ""
  read -n 1 -s -r -p "このウィンドウは閉じてOKです（何かキーを押す）"
  exit 0
fi

echo "▼ 今回の変更ファイル:"
git status --short
echo ""

STAMP=$(date '+%Y-%m-%d %H:%M')
git add -A
git commit -m "更新 ${STAMP}" >/dev/null

echo "公開中... (GitHubへ送信)"
if git push origin HEAD 2>&1 | grep -qiE 'error|rejected|fatal'; then
  echo ""
  echo "⚠ 公開に失敗しました。ネット接続を確認してもう一度実行してください。"
  git push origin HEAD
else
  echo ""
  echo "✅ 公開完了！ 1〜2分で反映されます。"
  echo "   https://dinamasulds-bit.github.io/-/"
fi

echo ""
read -n 1 -s -r -p "このウィンドウは閉じてOKです（何かキーを押す）"
