# dnf update + reboot first
dnf install epel-release -y
dnf install pandoc git -y
dnf install nginx -y
systemctl start nginx
systemctl enable nginx
cd /usr/share/nginx
git clone https://github.com/bjames/cyb3r.sh.git
echo "*/1 * * * * git -C /usr/share/nginx/cyb3r.sh pull" | EDITOR="tee -a" crontab -e
echo "*/5 * * * * /usr/share/nginx/cyb3r.sh/status.sh" | EDITOR="tee -a" crontab -e
# nginx config changes
dnf install dnf-automatic -y
# dnf automatic config changes (apply-updates = yes, reboot = when-needed, reboot-command = )
systemctl enable --now dnf-automatic.timer