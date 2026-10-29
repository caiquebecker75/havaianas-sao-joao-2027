#!/bin/bash
# Sobe a versão dos arquivos (cache) e copia o deck para a pasta do preview.
cd "$(dirname "$0")/.." || exit 1
v=$(date +%Y%m%d%H%M%S)
sed -i '' -E "s/(deck\.css|deck\.js|pecas\.js)\?v=[0-9]+/\1?v=$v/g" index.html
sed -i '' -E "s/(id=\"versaoDeck\" content=\")[0-9]+/\\1$v/" index.html
sed -i '' -E "s/(-75lab\.pdf)(\?v=[0-9]+)?\"/\\1?v=$v\"/g" index.html
echo "$v" > versao.txt
[ -n "$1" ] && rsync -a --delete --exclude fonte --exclude .git ./ "$1/"
echo "v=$v"
