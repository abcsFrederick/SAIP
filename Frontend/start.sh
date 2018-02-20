#!/bin/bash
echo "Start RESTful API Service"
#service scippyApi start
sudo systemctl start scippyApi  #download crash for some reason
echo "Start Scippy App Service"
npm run server
