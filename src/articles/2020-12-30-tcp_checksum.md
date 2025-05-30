---
title: No luck? sad! The Problem with TCP Checksums
date: 2020-12-30
tags:
- Route/Switch
- Security
author: Brandon James
---

[Hacker News recently led me to a Twitter post about AT&T Fiber flipping bits in the Bay Area](https://news.ycombinator.com/item?id=25335936). This was especially interesting because:

1) Intermediate routers and switches forwarded these packets (implying a valid Frame Check Sequence)
2) The destination hosts accepted these packets (implying a valid TCP checksum)

This article does not try to determine the root cause of the reported issue. Nor does it dive into why intermediate routers and switches forwarded these packets. Instead, we try to answer the question: Why would the destination host accept a packet with flipped bits?

# TL;DR

It's simple to craft packets with identical checksums. TCP datagrams with UTF-8 encoded payloads "No muck? rad!" and "No luck? sad!" have identical checksums if the rest of the packet is identical. Changing the 'm' in muck to 'l' and the 'r' in rad to 's' causes a binary 1 to flip to 0 and vice versa. Since these binary digits lie in the same position in different 16-bit words, the changes cancel each other out, resulting in the same checksum. 

Checksums *mostly work* for detecting damaged packets, but not reliably so. Fortunately, this is largely mitigated at other layers of the network stack. There is a small window within a layer 2 device, between checksum recalculations, where these types of errors can be introduced and even go undetected in many cleartext payloads. 

# Preliminaries

[RFC 793](https://tools.ietf.org/html/rfc793) Defines the TCP Checksum as follows:

> The checksum field is the 16 bit one's complement of the one's complement sum of all 16 bit words in the header and text.  If a segment contains an odd number of header and text octets to be checksummed, the last octet is padded on the right with zeros to form a 16 bit word for checksum purposes.  The pad is not transmitted as part of the segment.  While computing the checksum, the checksum field itself is replaced with zeros.

_Note: Although I use TCP in my example here, the UDP checksum works similarly and has the same flaws._

Lets define a couple things to make this easier to understand. 

**One's Complement**: One's Complement is a fancy way of saying "flip all the bits". 1 becomes 0, 0 becomes 1, 11110001 becomes 00001110

**One's Complement Sum**: Binary addition where we add carry bits back to the sum[^1]. 

```
    Example One's Complement Sum
    =================
    10110000 00000000
+   10010000 00000000
    -----------------
  1 01000000 00000000
 +\---------------->1
    -----------------
    01000000 00000001
```

# Checksum Calculation

TCP/UDP checksum calculation happens as follows: 

1) Break the packet into 16-bit chunks (padding if necessary)
2) Calculate the one's complement sum as described above
3) Take the one's complement of the sum

Let's use scapy to generate some packets. To keep things simple, we use a plaintext payload with no application data. Packet #1 has a payload of "No muck? rad!" and packet #2 has a payload of "No luck? sad!". Scapy's `show2()` function handles the checksum calculation for us.

```
>>> pkt1 = (IP(src="192.168.1.253",dst="192.168.1.254")/TCP(sport=65535,dport=65534)/"No muck? rad!")
>>> pkt1.show2()
###[ IP ]### 
  version= 4
  ihl= 5
  tos= 0x0
  len= 53
  id= 1
  flags= 
  frag= 0
  ttl= 64
  proto= tcp
  chksum= 0xf576
  src= 192.168.1.253
  dst= 192.168.1.254
  \options\
###[ TCP ]### 
     sport= 65535
     dport= 65534
     seq= 0
     ack= 0
     dataofs= 5
     reserved= 0
     flags= S
     window= 8192
     chksum= 0x1835
     urgptr= 0
     options= []
###[ Raw ]### 
        load= 'No muck? rad!'

>>> pkt2 = (IP(src="192.168.1.253",dst="192.168.1.254")/TCP(sport=65535,dport=65534)/"No luck? sad!")
>>> pkt2.show2()
###[ IP ]### 
  version= 4
  ihl= 5
  tos= 0x0
  len= 53
  id= 1
  flags= 
  frag= 0
  ttl= 64
  proto= tcp
  chksum= 0xf576
  src= 192.168.1.253
  dst= 192.168.1.254
  \options\
###[ TCP ]### 
     sport= 65535
     dport= 65534
     seq= 0
     ack= 0
     dataofs= 5
     reserved= 0
     flags= S
     window= 8192
     chksum= 0x1835
     urgptr= 0
     options= []
###[ Raw ]### 
        load= 'No luck? sad!'
```
_Note: The IP checksum is calculated in the nearly the same way as the TCP and UDP checksums. The key difference being the IP checksum only takes the IP header as input. Changes in higher layer data do not affect the IP checksum._

Since the checksum is a binary sum with carry bits getting shuffled to the least significant bit. It's simple to manipulate the bits in a way that doesn't affect the checksum. Notice in the scapy output, both packets have the same TCP checksum. An explanation of this follows:

## UTF-8 Payloads in Binary
```
No muck, rad!
=================
01001110 01101111 
00100000 01101101 
01110101 01100011 
01101011 00111111 
00100000 01110010 
01100001 01100100 
00100001 00000000

No luck, sad!
=================
01001110 01101111 
00100000 01101100 <- last bit flipped m changes to u
01110101 01100011 
01101011 00111111 
00100000 01110011 <- last bit flipped r changes to s
01100001 01100100 
00100001 00000000
```

## Calculating the One's Complement Sum of each Payload
```
    No muck? rad!
    =================
    01001110 01101111 
+   00100000 01101101 
    -----------------
    01101110 11011100
+   01110101 01100011 
    -----------------
    11100100 00111111
+   01101011 00111111 
    -----------------
  1 01001111 01111110
 +\---------------->1 <- carry
    11001111 01111111
+   00100000 01110010 
    -----------------
    01101111 11110001
+   01100001 01100100 
    -----------------
    11010001 01010101
+   00100001 00000000
    -----------------
    11110010 01010101


    No luck? sad! 
    =================
    01001110 01101111 
+   00100000 01101100 
    -----------------
    01101110 11011011
+   01110101 01100011 
    -----------------
    11100100 00111110
+   01101011 00111111 
    -----------------
  1 01001111 01111101
 +\---------------->1 <- carry 
    01001111 01111110
+   00100000 01110011 
    -----------------
    01101111 11110001
+   01100001 01100100 
    -----------------
    11010001 01010101
+   00100001 00000000
    -----------------
    11110010 01010101
    
```

As long as we flip bits so that changes cancel out, the sum (and it's one's complement) will remain the same. The case I presented above is simple: Flipping two bits in the same position in different 16-bit words. However, it's easy to imagine other combinations of bit flipping that result in the same sum and therefore, the same checksum.

```
    Payload
    =================
    10000000 00000010 
+   00000000 00001111 
    -----------------
    10000000 00010001
+   00000000 00001110
    -----------------
    10000000 00011111

    Mangled Payload
    =================
    10000000 00000000
+   10000000 00001111
    -----------------
  1 0000000 000001111
 +\---------------->1 <- carry 
    0000000 000010000
+   1000000 000001111
    -----------------
    10000000 00011111
```
_Note: the above is an arbitrary proof of concept_

# Takeaways and Closing Thoughts

We've shown it's trivial to craft packets with identical checksums. The checksum is not intended to be a security feature and should not be relied on as one. However, the checksum *is* meant to detect damaged packets. It's easy to imagine a scenario where a hardware failure or software bug causes bits to be flipped in a pattern that results in valid checksums for damaged packets. So while it may catch *almost all* damaged packets, it would be hard to consider it a *reliable* detection method. 

Many issues caused by the weakness of TCP/UDP checksums are resolved at higher and lower layers of the network stack. When encryption is used at the application layer, a single flipped bit will turn the encrypted message into junk that will most likely be discarded. Layer 2 protocols such as Ethernet and 802.11 utilize **Frame Check Sequences (FCS)**. The FCS is often implemented as a **Cyclic Redundancy Check (CRC)** and doesn't have the same flaws as TCP/UDP Checksums. However, there is some opportunity for uncaught payload errors to be introduced by bad hardware or software within a layer 2 device since the FCS is removed at ingress and recalculated at egress. 

To speculate a bit about the AT&T Fiber bit flipping issue. The narrow window of opportunity within a single device, between CRC recalculations, may have been what caused the problem. Or it could've been numerous other things, networks are complicated. Regardless, it doesn't seem like the TCP checksum was doing much to help the situation.

[^1]: I largely based how I showed this on [The Math Forum's Ask Dr. Math example on one's complement addition](http://mathforum.org/library/drmath/view/54379.html). This is actually based on one's complement subtraction (except in this case we skip calculating the one's complement of the subtrahend), which you can learn more about [here](https://courses.cs.vt.edu/csonline/NumberSystems/Lessons/SubtractionWithOnesComplement/index.html). 
