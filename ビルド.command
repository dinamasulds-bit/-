#!/bin/bash
# ダブルクリックで src/ から index.html を組み立て直すスクリプト。
# 月データを足したり src/js/*.js を直したあとに実行する。
cd "$(dirname "$0")" || exit 1

echo "=============================="
echo " 首都圏イベント管理簿 ビルド"
echo "=============================="
echo ""

if ! python3 build.py; then
  echo ""
  echo "⚠ ビルドに失敗しました。上のエラーを確認してください。"
  read -n 1 -s -r -p "このウィンドウは閉じてOKです（何かキーを押す）"
  exit 1
fi

echo ""
echo "続けて公開する場合は「公開.command」をダブルクリックしてください。"
echo ""
read -n 1 -s -r -p "このウィンドウは閉じてOKです（何かキーを押す）"
