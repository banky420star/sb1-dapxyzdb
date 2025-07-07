#!/bin/bash
SERVER_IP=64.176.199.22
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '*.log' \
    . root@$SERVER_IP:/home/appuser/ai-trading-system/

ssh root@$SERVER_IP 'cd /home/appuser/ai-trading-system && npm install && npm run build && pm2 start server.js --name ai-trading && pm2 save && pm2 startup systemd -u appuser --hp /home/appuser'
