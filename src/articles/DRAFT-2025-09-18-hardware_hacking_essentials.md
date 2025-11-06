---
title: Hardware Hacking Essentials
date: 2025-09-18
tags:
- hardware
author: Brandon James
---

Hardware hacking is something I play with from time to time. This is meant to be something less than a walkthrough, think of it as a nudge in the right direction that does double duty as notes for myself when I need a bit of a refresher.

# Targets

* [TP-Link TL-WR841N](https://www.tp-link.com/us/home-networking/wifi-router/tl-wr841n/)
    * This is a pretty common intro to hardware hacking target. [TCM Security](https://academy.tcm-sec.com/) uses it in their hardware hacking course. If you want to follow this with a much more in depth course, I'd highly recommend TCM. 
* [Owlett Cam](https://owletbaby.com/products/owlet-cam-2) (v1 - link is to V2) 
    * This is something that I had lying around and that happened to not immediately give you a shell on UART, but wasn't overly difficult to  get a shell on. 

# Hardware Used

* A multimeter with continuity and voltage modes. I have a UNI-T UT139C and it's little brother UNI-T UT116C. 
* A flash programmer supported by `flashrom` (see `flashrom -p` for a list). I use the CH421a, [buspirate](https://buspirate/) has this listed as a feature, but it's so easy with the CH421a I honestly just reach for it instead despite owning a buspirate. 
* A logic analyzer. I use the [DSLogic U3Pro16](https://www.dreamsourcelab.com/product/dslogic-series/), [Saleae](https://www.saleae.com/) is also always a good choice. There are also plenty of cheap logic analyzers that can handle slower protocols like UART.
* USB-to-UART, there are quite a few tools out here that can do this. Cheap CP2102 adapters from amazon do the job just fine, but for a few more dollars, a [buspirate](https://buspirate.com/) or [flipper zero](https://flipperzero.one/) (ok, this one is more than a few dollars more) can do all that and more. 

# Software Used

* Serial terminal emulator - I use `picocom` for this. Alternatively you can use `screen` or PuTTY if on Windows. I avoid `screen` because `screen` inside `tmux` can be a pain. 
* An application to interface with your logic analyzer. I use DSView (available as a flatpak) because I use a DSLogic device. Seleae users would use Logic2 and (generally) everyone else should use Sigrok
* Flashrom to dump flash memory
* Binwalk to extract data from the flash dump

# Probing for interesting points

With my multimeter, I'm usually trying to answer a few questions.

1. Where are my ground points? 
2. What points on the PCB might be interesting for further analysis?
3. What points (if any) might blow up my equipment meant to operate at logic levels. 

## Ground Points

I like options when it comes to ground points. Voltage is measured relative to ground, so anytime we measure an electrical signal, we need to make that measurement relative to that device's ground. This may or may not be the same as the device we are measuring from. As an example, I have a Raspberry Pi on my workbench, when measuring voltage of a point labeled 3v3 using a ground point on the device it measures 3.3v (red lead on 3v3, black on GND), however if I ground my multimeter to a different device I measure 2.8v (red lead on 3v3, black on my grounded anti-static mat's ground port). 

Ground points are normally be found using continuity mode on your multimeter while the device is unplugged. In continuity mode, your multimeter sends a small current through the circuit. If this is received by the opposite test lead, the multimeter beeps (and in the case of mine, it also displays the resistance measurement). Often there will be at least one labeled ground, some devices are ground via their chassis, others through the connection to their power supply. Note that grounds will always have continuity with one another, but not every two points with continuity are grounds. So you want to ensure you have a known ground before you can find other ground points. 

Once you have your ground points (or at least know where enough of them are to be useful)

# Using a logic analyzer

