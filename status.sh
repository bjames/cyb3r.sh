echo "Status report generated at $(date)" > /usr/share/nginx/cyb3r.sh/site/status.txt
echo "----------------" >> /usr/share/nginx/cyb3r.sh/site/status.txt
uptime -p >> /usr/share/nginx/cyb3r.sh/site/status.txt
/usr/sbin/shutdown --show 2>&1 | awk -F ',' '{ print $1 }' >> /usr/share/nginx/cyb3r.sh/site/status.txt
echo "----------------" >> /usr/share/nginx/cyb3r.sh/site/status.txt
echo "last commit" >> /usr/share/nginx/cyb3r.sh/site/status.txt
echo "----------------" >> /usr/share/nginx/cyb3r.sh/site/status.txt
git -C /usr/share/nginx/cyb3r.sh show -1 --stat >> /usr/share/nginx/cyb3r.sh/site/status.txt