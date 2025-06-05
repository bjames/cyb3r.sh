---
title: Ode to simplicity
date: 2025-05-29
tags:
- Bash
- Linux
author: Brandon James
---

I've had a blog in some form for many years. This blog is a continuation of my longest lived professional blog. Most of the articles were moved from my old domain, neverthenetwork.com (although that domain had some stuff that was not moved). I'm particularly excited about this release because I think I've finally landed on something that's truely simple. I'll do a deeper dive in a follow-up post, but this site effectively works as follows:

Write Markdown -> Run a shell script -> Git Commit/Push

The shell script generates a static site using pandoc and a little bit of bash. The website looks exactly the same whether behind nginx on the web or when served locally from my laptop. All I have to do now is write and I can do my writing in any text editor of my choosing. 

I've used a few different solutions over the years, in order these are:

- Static HTML
- Wordpress
- Ghost
- Custom Site built on Flask + Flask-Flatpages
- Jekyll 

Of these, my favorite solution has been Flask-Flatpages. It allowed me to write my blog posts in markdown, but then rendered them as HTML at server start time. This resulted in a mostly nice workflow. Write Markdown -> Use pandoc to generate a preview -> Push to the webserver. It wasn't quite perfect since pandoc and Flask-Flatpages generated slightly different HTML, but overall this worked really well. Especially for writing. The use of Flask made it easy to write little web apps. At the time, I wanted an easy way to get an external view of **things** on the internet. That way if something was broken at my day job, I could use my website to see if it was broken externally as well. I rarely used these tools, but they were fun to build. In practice I found if I need to do something like this, It was much more flexible to just use my phone or personal laptop and either my carrier network or my home network via VPN. 

Wordpress and Ghost mostly suffered from the same issue. I greatly preferred ghost over wordpress. It's a simpler solution and I prefer markdown for focused writing. However, I often ran into situations where I wanted to write without an internet connection and even when I had an internet connection, I really didn't like writing in my web brower. So I found I would often write markdown locally and then copy and paste the file into ghost when I was ready to publish.

I had high hopes for Jekyll, but it's really a bit complicated for my use-case. While it does allow me to write markdown in an editor, running it locally is a bit of a pain and unless you run it locally, you can't be exactly sure what the article will look like before it's been pushed. Also, themes are challenging enough that I can't be bothered to mess with them. 
