---
title: Bitwise Operations and Subnetting
date: 2019-07-29
tags:
- Route/Switch
- Programming
author: Brandon James
---

Back in September of 2016 I wrote a [subnet calculator in C](https://github.com/bjames/subnet) and then blogged about it. This entry is based on that old blog post.

## Converting To and From Dotted Decimal Notation

IPv4 Addresses are simply unsigned 32-bit integers. This makes it easy to perform calculations on them using bitwise operations. It's common to see IP addresses represented as four seperate octets. This is done primarily for readablity, but it also aids in intuition when you start looking at the math behind IP subnets. 

### Converting FROM Dotted Decimal Notation

In order to do anything useful, we first need to take the human provided dotted decimal notation and convert it to a 32 bit unsigned integer. 

```
unsigned int dotted_decimal_to_int(char ip[]){
 
    // char is exactly 1 byte
    unsigned char bytes[4] = {0};
    
    sscanf(ip, "%hhd.%hhd.%hhd.%hhd", &bytes[3], &bytes[2], &bytes[1], &bytes[0]);
    
    // set 1 byte at a time by left shifting (<<) and ORing (|)
    return bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24;

}
```

This function works by scanning the C string containing the IP address provided by the user into an array of bytes. It then returns an unsigned integer. Using 192.168.0.1 as an example, we first read the octets into an arry of bytes. This results in something similar to the following in memory:

<div class=table_wrap>
    <table style="font-family:monospace">
      <tr>
        <th>Byte 0</th>
        <th>Byte 1</th>
        <th>Byte 2</th>
        <th>Byte 3</th>
        <th>Base</th>
      </tr>
      <tr>
        <td>192</td>
        <td>168</td>
        <td>0</td>
        <td>1</td>
        <td>Decimal</td>
      </tr>
      <tr>
        <td>11000000<br></td>
        <td>10101000</td>
        <td>00000000</td>
        <td>00000001</td>
        <td>Binary</td>
      </tr>
    </table>
</div>

As we return the unsigned int, the bytes are left shifted so that they are properly aligned and then a logical OR is applied to combine the bytes. The result of this is a 32-bit representation of the IP address. In this case, the resulting integer in decimal is 3,232,235,521. The table below shows what the left shift looks like in memory. 

<div class=table_wrap>
<table style="font-family:monospace">
 <tbody>
 <tr>
 <th>Variable</th>
 <th>Byte 0</th>
 <th>Byte 1</th>
 <th>Byte 2</th>
 <th>Byte 3</th>
 <th>Operation</th>
 </tr>
 <tr>
 <td>Byte[3]</td>
 <td><span style="visibility: hidden;">00000000</span></td>
 <td><span style="visibility: hidden;">00000000</span></td>
 <td><span style="visibility: hidden;">00000000</span></td>
 <td>00000001</td>
 <td>N/A</td>
 </tr>
 </tbody>
 </table>
</div>
<div class=table_wrap>
<table style="font-family:monospace">
 <tbody>
 <tr>
 <th>Variable</th>
 <th>Byte 0</th>
 <th>Byte 1</th>
 <th>Byte 2</th>
 <th>Byte 3</th>
 <th>Operation</th>
 </tr>
 <tr>
 <td>Byte[2]</td>
 <td><span style="visibility: hidden;">00000000</span></td>
 <td><span style="visibility: hidden;">00000000</span></td>
 <td><span style="visibility: hidden;">00000000</span></td>
 <td>00000000</td>
 <td>>>8</td>
 </tr>
 <tr>
 <td>Result</td>
 <td></td>
 <td></td>
 <td>00000000</td>
 <td>00000000</td>
 <td></td>
 </tr>
 </tbody>
 </table>
</div>
<div class=table_wrap>
<table style="font-family:monospace">
 <tbody>
 <tr>
 <th>Variable</th>
 <th>Byte 0</th>
 <th>Byte 1</th>
 <th>Byte 2</th>
 <th>Byte 3</th>
 <th>Operation</th>
 </tr>
 <tr>
 <td>Byte[1]</td>
 <td><span style="visibility: hidden;">00000000</span></td>
 <td><span style="visibility: hidden;">00000000</span></td>
 <td><span style="visibility: hidden;">00000000</span></td>
 <td>10101000</td>
 <td>>>16</td>
 </tr>
 <tr>
 <td>Result</td>
 <td></td>
 <td>10101000</td>
 <td>00000000</td>
 <td>00000000</td>
 <td></td>
 </tr>
 </tbody>
 </table>
</div>
<div class=table_wrap>
<table style="font-family:monospace">
 <tbody>
 <tr>
 <th>Variable</th>
 <th>Byte 0</th>
 <th>Byte 1</th>
 <th>Byte 2</th>
 <th>Byte 3</th>
 <th>Operation</th>
 </tr>
 <tr>
 <td>Byte[0]</td>
 <td></td>
 <td></td>
 <td></td>
 <td>11000000</td>
 <td>>>24</td>
 </tr>
 <tr>
 <td>Result</td>
 <td>11000000</td>
 <td>00000000</td>
 <td>00000000</td>
 <td>00000000</td>
 <td></td>
 </tr>
 </tbody>
 </table>
</div>
 And the OR operation:
<div class=table_wrap>
 <table style="font-family:monospace">
 <tbody>
 <tr>
 <th>Variable</th>
 <th>Byte 0</th>
 <th>Byte 1</th>
 <th>Byte 2</th>
 <th>Byte 3</th>
 <th>Operation</th>
 </tr>
 <tr>
 <td>Byte[0]</td>
 <td>11000000</td>
 <td>00000000</td>
 <td>00000000</td>
 <td>00000000</td>
 <td></td>
 </tr>
 <tr>
 <td>Byte[1]</td>
 <td></td>
 <td>10101000</td>
 <td>00000000</td>
 <td>00000000</td>
 <td>OR</td>
 </tr>
 <tr>
 <td>Result</td>
 <td>11000000</td>
 <td>10101000</td>
 <td>00000000</td>
 <td>00000000</td>
 <td></td>
 </tr>
 <tr>
 <td>Byte[2]</td>
 <td></td>
 <td></td>
 <td>00000000</td>
 <td>00000000</td>
 <td>OR</td>
 </tr>
 <tr>
 <td>Result</td>
 <td>11000000</td>
 <td>10101000</td>
 <td>00000000</td>
 <td>00000000</td>
 <td></td>
 </tr>
 <tr>
 <td>Byte[3]</td>
 <td></td>
 <td></td>
 <td></td>
 <td>00000001</td>
 <td>OR</td>
 </tr>
 <tr>
 <td>Result</td>
 <td>11000000</td>
 <td>10101000</td>
 <td>00000000</td>
 <td>00000001</td>
 <td></td>
 </tr>
 </tbody>
 </table>
</div>
### Converting TO Dotted Decimal Notation

After we've finished performing our calculations, we need to return the subnet to a human readable format. This can be done with the following function:

```
void printip(int ip){
 
    // takes a 32 bit integer and prints it as 4 decimal separate octets
    
    unsigned char bytes[4];
    
    // set the byte to the first byte of the ip
    bytes[0] = ip;
    bytes[1] = ip >> 8; // right shift by a byte and repeat
    bytes[2] = ip >> 16;
    bytes[3] = ip >> 24;
    
    printf("%d.%d.%d.%d\n", bytes[3], bytes[2], bytes[1], bytes[0]);
    
    return;

 }
```

This function works by taking our 32-bit integer and breaking it into 4 separate bytes that can be evaluated separately. We do this by assigning each separate byte to a member of a char array. This is done by right shifting the number by 8 bits prior to each assignment. Note that the right shift operator causes the bits at the end get rotated to the front.

Using 192.168.0.1 as our example again:
<div class=table_wrap>
<table style="font-family:monospace">
    <tr>
        <th>Variable</th>
        <th>Byte 0</th>
        <th>Byte 1</th>
        <th>Byte 2</th>
        <th>Byte 3</th>
        <th>Operation</th>
    </tr>
    <tr>
        <td>byte[0]</td>
        <td><strong>11000000</strong></td>
        <td>10101000</td>
        <td>00000000</td>
        <td>00000001</td>
        <td></td>
    </tr>
    <tr>
        <td>byte[1]</td>
        <td><strong>10101000</strong></td>
        <td>00000000</td>
        <td>00000001</td>
        <td>11000000</td>
        <td><<8</td>
    </tr>
    <tr>
        <td>byte[2]</td>
        <td><strong>00000000</strong></td>
        <td>00000001</td>
        <td>11000000</td>
        <td>10101000</td>
        <td><<16</td>
    </tr>
    <tr>
        <td>byte[3]</td>
        <td><strong>00000001</strong></td>
        <td>11000000</td>
        <td>10101000</td>
        <td>10101000</td>
        <td><<24</td>
    </tr>
</table>
</div>
In the above example, after each shift we are setting the contents of byte 1 to the current index of our byte array. Then we simply use printf to display the integer in dotted decimal notation. 

### Converting To and From CIDR Notation

Subnets are commonly referenced using CIDR notation (eg 192.168.0.0/24). Since CIDR notation is simply the number of most significant bits set, it's pretty easy to create a function to do the conversion.

```
unsigned int cidr_to_mask(unsigned int cidrValue){ 
    
    // left shift 1 by 32 - cidr, subtract 1 from the result and XORing
    // it with a mask that has all bits set, yeilds the subnet mask
    return -1 ^ ((1 << (32 - cidrValue)) - 1);

}
```

I'll show how this works by using a /24 mask. First we subtract 32 by 24, which yields 8. Then we left shift 1 8 times, which yields 1 00000000. Next, we subtract the result by 1, yielding 11111111. Finally, we XOR the result with -1 (when working with unsigned values, -1 sets all bits), which results in 11111111 11111111 11111111 00000000.
<div class=table_wrap>
<table style="font-family:monospace">
 <tr>
 <th>Variable</th>
 <th>Byte 0</th>
 <th>Byte 1</th>
 <th>Byte 2</th>
 <th>Byte 3</th>
 <th>Operation</th>
 </tr>
 <tr>
 <td></td>
 <td>00000000</td>
 <td>00000000</td>
 <td>00000000</td>
 <td>00000001</td>
 <td><<8</td>
 </tr>
 <tr>
 <td>Result</td>
 <td>00000000</td>
 <td>00000000</td>
 <td>00000001</td>
 <td>00000000</td>
 <td>-1</td>
 </tr>
 <tr>
 <td>Result</td>
 <td>00000000</td>
 <td>00000000</td>
 <td>00000000</td>
 <td>11111111</td>
 <td></td>
 </tr>
 <tr>
 <td>-1</td>
 <td> 11111111</td>
 <td> 11111111</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>XOR</td>
 </tr>
 <tr>
 <td>Result</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>00000000</td>
 <td></td>
 </tr>
 </table>
</div>
 Additionally, if the user gives us a subnet mask using dotted decimal notation, we'll want to give them the mask in CIDR notation. This can be done by counting the number of bits set in the subnet mask.  

```
unsigned int cidr_to_mask(unsigned int cidrValue){
 
    // left shift 1 by 32 - cidr, subtract 1 from the result and XORing
    // it with a mask that has all bits set, yeilds the subnet mask
    return -1 ^ ((1 << (32 - cidrValue)) - 1);

}
```

This function works as follows:
<div class=table_wrap>
<table style="font-family:monospace">
 <tr>
 <th>Variable</th>
 <th>Byte 0</th>
 <th>Byte 1</th>
 <th>Byte 2</th>
 <th>Byte 3</th>
 <th>Operation</th>
 <th>CIDR</th>
 </tr>
 <tr>
 <td>Mask</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>00000000</td>
 <td></td>
 <td></td>
 </tr>
 <tr>
 <td>Mask - 1</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>11111110</td>
 <td>00000000</td>
 <td>AND</td>
 <td></td>
 </tr>
 <tr>
 <td>Result</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>11111110</td>
 <td>00000000</td>
 <td></td>
 <td> 1</td>
 </tr>
 <tr>
 <td>Result - 1</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>11111101</td>
 <td>00000000</td>
 <td>AND</td>
 <td></td>
 </tr>
 <tr>
 <td>Result</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>11111100</td>
 <td>00000000</td>
 <td></td>
 <td> 2</td>
 </tr>
 <tr>
 <td>Result - 1</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>‭11111011‬</td>
 <td>00000000</td>
 <td>AND</td>
 <td></td>
 </tr>
 <tr>
 <td>Result</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>‭11111000‬</td>
 <td>00000000</td>
 <td></td>
 <td> 3</td>
 </tr>
 <tr>
 <td>Result</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>‭11110111‬</td>
 <td>00000000</td>
 <td>AND</td>
 <td></td>
 </tr>
 <tr>
 <td>Result</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>‭11110000‬</td>
 <td>00000000</td>
 <td></td>
 <td> 4</td>
 </tr>
</table>
</div>
...

> continue until no bits are set

Now that we've dealt with the human readability issues. Let's take a look at the operations that actually deal with subnet calculations.

### Calculating the Network and Broadcast Address

First off, to calculate the Network or Subnet address, we simply take the IP address and netmask and apply the AND operation. The truth table below is for an IP address of 192.168.0.10 with a /24 mask.
<div class=table_wrap>
<table style="font-family:monospace">
 <tbody>
 <tr>
 <th>Variable</th>
 <th>Byte 0</th>
 <th>Byte 1</th>
 <th>Byte 2</th>
 <th>Byte 3</th>
 <th>Operation</th>
 </tr>
 <tr>
 <td>IP</td>
 <td>11000000</td>
 <td>10101000</td>
 <td>00000000</td>
 <td>00001010</td>
 <td></td>
 </tr>
 <tr>
 <td>Mask</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>11111111</td>
 <td>00000000</td>
 <td>AND</td>
 </tr>
 <tr>
 <td>Result</td>
 <td>11000000</td>
 <td>10101000</td>
 <td>00000000</td>
 <td>00000000</td>
 <td></td>
 </tr>
</table>
</div>
In C this function is simply expressed as:

```
unsigned int calc_network_address(unsigned int ipaddress, unsigned int netmask){
    return ipaddress & netmask;
}
```

Calculating the broadcast address is as simple as adding the network address to the subnet's complement (ie the result of the NOT operation on the subnet mask). Again using the same network as our previous example.
<div class=table_wrap>
<table style="font-family:monospace">
 <tr>
 <th>Variable</th>
 <th>Byte 0</th>
 <th>Byte 1</th>
 <th>Byte 2</th>
 <th>Byte 3</th>
 <th>Operation</th>
 </tr>
 <tr>
 <td>IP</td>
 <td>11000000</td>
 <td>10101000</td>
 <td>00000000</td>
 <td>00000000</td>
 <td></td>
 </tr>
 <tr>
 <td>~Mask</td>
 <td>00000000</td>
 <td>00000000</td>
 <td>00000000</td>
 <td>11111111</td>
 <td>+</td>
 </tr>
 <tr>
 <td>Result</td>
 <td>11000000</td>
 <td>10101000</td>
 <td>00000000</td>
 <td>11111111</td>
 <td></td>
 </tr>
</table>
</div>
The dotted decimal result is 192.168.0.255. This is another operation that is easily expressed in C.

```
unsigned int calc_broadcast(unsigned int network, unsigned int netmask){
    return network + (~netmask);
}
```
### Other Calculations

Once we have the network address and the subnet mask, it's trivial to calculate our first host (network address + 1), last host (broadcast address - 1) and number of hosts (broadcast - first host).

This is not the most complete subnet calculator on the internet, nor is it supposed to be. However, I think it provides several good examples of things that can be done with bitwise operations and provides additional intuition for why we use subnet masks.
