---
title: If you knock, I'll let you in. Marking UDP traffic as Established.
date: 2021-04-29
tags:
- Security
- Linux
- Networking
- GoPro
author: Brandon James
---

Despite being a connectionless protocol, many firewalls are able to track the state of UDP communication. One such firewall is IPtables on Linux. Let's consider a simple IPtables input policy permitting related and established traffic, but dropping everything else. 

```
Chain INPUT (policy DROP)
target     prot opt source               destination
ACCEPT     all  --  anywhere             anywhere             state RELATED,ESTABLISHED
```

Now, let's consider a GoPro Hero8 in webcam mode. After you've sent an HTTP GET request to the API endpoint `/gp/gpWebcam/START`, the GoPro will begin streaming video to your device on UDP/8554 via a network connection that exists between your host and the GoPro's USB-C port. IPtables has no way of knowing you've requested the service start streaming UDP data. So, it's going to drop the traffic at ingress. 

Since I wanted to use my GoPro as a webcam and didn't have a great way to modify my firewall rules[^1], I needed to come up with a workaround.

## IPtables state tracking

State tracking in IPtables works similarly to state tracking in other firewall systems. A connection is marked as ESTABLISHED if the firewall has seen bidirectional traffic. For instance, if I send an HTTP request with a SRC PORT of 485034 and a DST PORT of 80, return traffic from the webhost with a SRC PORT of 80 to TCP 485034 would be marked as ESTABLISHED. 

RELATED traffic is a little trickier and requires some knowledge of specific protocols to implement. In the case of our GoPro, if this was a well known protocol someone might be able to write a connection tracking helper that says if our host sends a HTTP GET request to the API endpoint `/gp/gpWebcam/START`, then traffic from the GoPro to UDP/8554 is RELATED and should be accepted. 

Since the stream from the camera is not considered RELATED or ESTABLISHED, it will be dropped by IPtables. 

## Workaround

A possible workaround is to 'trick' IPtables into thinking this traffic is ESTABLISHED. To do this, we can use ncat to send a single packet, sourced from UDP/8554 destined to the UDP source port of the camera for this stream.

```
echo -n "camera" | nc --send-only -u 172.24.107.51 41115 -s 172.24.107.54 -p 8554 >/dev/null
```

In the case of a GoPro camera, the source port actually changes each time a new stream is started. So, we can use TCPdump to find the source port before using ncat to send the packet that marks the connection as established.

```
goproport=$(sudo tcpdump -ni $dev -c 1 dst port 8554 2>/dev/null| grep -o '51.[0-9]*' | grep -o '.[0-9]*$' | cut -c2-)
echo "sending a packet to UDP $goproport so IPtables marks the traffic as established"
echo -n "gopro" | nc --send-only -u $gopro_ip $goproport -s $ip -p 8554 >/dev/null
```

Once this is done, the traffic is marked as established and is permitted by our IPtables policy.

## Additional Notes on using the GoPro Hero 8 as a webcam

In an effort to get a free upgrade of my video conferencing setup, I've been working on a way to use my GoPro Hero 8 as a webcam. I use Linux at home and at work, so the official GoPro Webcam software doesn't work for me. [Joshua Schmid](https://github.com/jschmid1/gopro_as_webcam_on_linux) wrote a very nice service to handle GoPro's in Linux, but for my use I just wanted a script I can kill once the VC is over. So, I took the relevant bits of his service and added a couple of options to crop the output and packaged it into a [script](https://github.com/bjames/gopro). 

When the GoPro is plugged in and powered on, it appears as a USB network adapter. Your computer will receive an IP address via DHCP from the GoPro. The GoPro network will be a random /24 in the 172.16.0.0/12 address space. 

```
┌─(bjames@t470s)-[~]
└─$ dmesg | tail -n 8
[90741.967632] usb 1-4: new high-speed USB device number 15 using xhci_hcd
[90742.095883] usb 1-4: New USB device found, idVendor=2672, idProduct=0050, bcdDevice= 4.04
[90742.095896] usb 1-4: New USB device strings: Mfr=1, Product=2, SerialNumber=3
[90742.095903] usb 1-4: Product: HERO8 BLACK
[90742.095907] usb 1-4: Manufacturer: GoPro
[90742.095911] usb 1-4: SerialNumber: <REDACTED>
[90742.101411] cdc_ether 1-4:1.0 usb0: register 'cdc_ether' at usb-0000:00:14.0-4, CDC Ethernet Device, e2:24:93:81:5f:87
[90742.141368] cdc_ether 1-4:1.0 enp0s20f0u4: renamed from usb0
┌─(bjames@t470s)-[~]
└─$ ip a show dev enp0s20f0u4
11: enp0s20f0u4: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether e2:24:93:81:5f:87 brd ff:ff:ff:ff:ff:ff
    inet 172.24.107.55/24 brd 172.24.107.255 scope global dynamic noprefixroute enp0s20f0u4
       valid_lft 863384sec preferred_lft 863384sec
    inet6 fe80::323:669:22c1:a37d/64 scope link noprefixroute
       valid_lft forever preferred_lft forever
```

The GoPro itself will be on 172.16.x.51 and listening on 5 ports. Four of these ports all seem to implement the exact same RESTful service. I've made no attempt to enumerate the API's endpoints, but its fairly well documented that `gp/gpWebcam/START` causes the camera to start streaming video and `gp/gpWebcam/STOP` causes it to stop. 

```
┌─(bjames@t470s)-[~]
└─$ nmap -sT 172.24.107.51
Starting Nmap 7.80 ( https://nmap.org ) at 2021-04-20 22:54 CDT
Nmap scan report for 172.24.107.51
Host is up (0.015s latency).
Not shown: 995 closed ports
PORT     STATE SERVICE
80/tcp   open  http
8000/tcp open  http-alt
8001/tcp open  vcom-tunnel
8080/tcp open  http-proxy
8081/tcp open  blackice-icecap

Nmap done: 1 IP address (1 host up) scanned in 13.20 seconds
┌─(bjames@t470s)-[~]
└─$ curl http://172.24.107.51/gp/gpWebcam/STOP
{
	"status": 1,
	"error": 0
}
┌─(bjames@t470s)-[~]
└─$ curl http://172.24.107.51/gp/gpWebcam/START
{
	"status": 2,
	"error": 0
}
┌─(bjames@t470s)-[~]
└─$ sudo tcpdump -i enp0s20f0u4
dropped privs to tcpdump
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on enp0s20f0u4, link-type EN10MB (Ethernet), snapshot length 262144 bytes
23:22:04.036631 IP 172.24.107.51.41115 > t470s.rtsp-alt: UDP, length 564
23:22:04.036984 IP 172.24.107.51.41115 > t470s.rtsp-alt: UDP, length 1316
23:22:04.037243 IP 172.24.107.51.41115 > t470s.rtsp-alt: UDP, length 1316
23:22:04.037522 IP 172.24.107.51.41115 > t470s.rtsp-alt: UDP, length 1316
23:22:04.037663 IP 172.24.107.51.41115 > t470s.rtsp-alt: UDP, length 1316
```

Finally, the stream can be sent to a v4l2loopback device using FFMPEG. This will give you a device called GoPro you can select using your video conferencing software. 

```
# Create the v4l2loopback device
sudo modprobe v4l2loopback exclusive_caps=1 card_label='GoPro' video_nr=42
# No Crop
ffmpeg -nostdin -threads 1 -i 'udp://@0.0.0.0:8554?overrun_nonfatal=1&fifo_size=50000000' -f:v mpegts -fflags nobuffer -vf format=yuv420p -f v4l2 /dev/video42 >/tmp/ffmpeggopro 2>&1 &
# Crop to 720p
ffmpeg -nostdin -threads 1 -i 'udp://@0.0.0.0:8554?overrun_nonfatal=1&fifo_size=50000000' -f:v mpegts -fflags nobuffer -vf 'format=yuv420p,crop=1280:720' -f v4l2 /dev/video42 >/tmp/ffmpeggopro 2>&1 &
# Crop to 480p
ffmpeg -nostdin -threads 1 -i 'udp://@0.0.0.0:8554?overrun_nonfatal=1&fifo_size=50000000' -f:v mpegts -fflags nobuffer -vf 'format=yuv420p,crop=720:480' -f v4l2 /dev/video42 >/tmp/ffmpeggopro 2>&1 &
```

I am not an expert on ffmpeg or video streams in general. Other then the crop settings, these were lifted from [Joshua Schmid's](https://github.com/jschmid1) Linux GoPro service. Roughly, we are telling ffmpeg to take the mpegts stream from the GoPro and convert it to a v4l2 stream. 

[^1]: The subnet, source port and interface name used by the GoPro isn't consistent between reboots so any permanent IPtables changes would need to be overly broad.
