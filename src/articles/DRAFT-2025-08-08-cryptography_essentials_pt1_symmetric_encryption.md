---
title: Practical Cryptography Essentials Part 1 - Symmetric Encryption
date: 2025-08-08
tags:
- Cryptography
author: Brandon James
---

In this series, I cover the very basics needed to acquire working knowledge about cryptography as used in the industry today. You'll learn enough about the algorithms to get an *idea* of how they work, in addition to some ways to apply those algorithms. I gloss over a lot of the details on how the algorithms function as quite frankly, they really don't matter for your average practitioner and I am not a cryptographer I am both unable and unwilling to go into the minutia that makes these algorithms secure. 

# Symmetric Encryption

Like the ancient Caesar Cipher, but with huge differences on the backend, Symmetric Encryption is a form of encryption where the key used for encryption is also used for decryption. Examples of symmetric encryption algorithms include AES, [3]DES, (Blow|Two|Three)fish and ChaCha20. If you work in technology, you've likely heard of some of these algorithms and since you're on my website, you either used ChaCha20 or AES to load this page (well, unless my cipher suites have changed since the time of writing). You may also be aware that 3DES is no longer considered secure[^1] and that Blowfish shouldn't be used for files larger than 4GB[^2]. 

Just how secure are these algorithms? It's commonly stated that 128-bit AES would take more than the current age of the universe to crack[^3]. 256-bit AES is likely quantum safe, assuming no new quantum algorithms produce speed-ups beyond that of Grover's algorithm[^4]. They are quite good, assuming you can securely manage your keys.

## Why not roll your own?

There are a few "obvious" ways to implement a symmetric encryption algorithm. The ones that are obvious (to me anyways) are generally bad. We'll only talk about one of these here. XOR encryption often comes up in the context of CTFs. Let's define a XOR encryption scheme and talk about what makes it bad. 

_k_ = 0xef3c
_M_ = "the quick brown fox jumps over the lazy dog"

Where _k_ is a 16 bit encryption key and _M_ is the message we want to encrypt. 

## Key Distribution Problem



[^1]: [NIST.SP.800-131Ar2 section 1.1](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-131Ar2.pdf)
[^2]: "Blowfish should not be used to encrypt files larger than 4Gb in size, but Twofish has no such restrictions" [gnupg.org](https://gnupg.org/faq/gnupg-faq.html#define_fish)
[^3]: [Stack exchange](https://crypto.stackexchange.com/questions/48667/how-long-would-it-take-to-brute-force-an-aes-128-key) is a reliable source right? 
[^4]: Seriously, do I cite anything other than [stack exchange](https://crypto.stackexchange.com/questions/6712/is-aes-256-a-post-quantum-secure-cipher-or-not)? 