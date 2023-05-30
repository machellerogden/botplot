#!/usr/bin/env bash
wget -O ./local/html0.dylib https://github.com/asg017/sqlite-html/releases/download/v0.1.0/html0.dylib
wget -O ./local/lines0.dylib https://github.com/asg017/sqlite-lines/releases/download/v0.1.1/lines0.dylib
wget -c https://github.com/asg017/sqlite-vss/releases/download/v0.1.0/sqlite-vss-v0.1.0-vector0-darwin-aarch64.tar.gz -O - | tar -xzvf - -C ./local 
wget -c https://github.com/asg017/sqlite-vss/releases/download/v0.1.0/sqlite-vss-v0.1.0-vss0-darwin-aarch64.tar.gz -O - | tar -xzvf - -C ./local 
