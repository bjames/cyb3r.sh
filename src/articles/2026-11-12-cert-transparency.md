---
title: 'Merkle Trees, CT and MTCs: Part 2 - Certificate Transparency'
date: 2026-11-12
tags:
- Cryptography
author: Brandon James
---

Certificate Transparency (CT) was introduced in 2013 as a response to the DigiNotar breach[^DigiNotar]. [RFC 6962](https://www.rfc-editor.org/info/rfc6962/) was published in June 2013 and it was recently superceeded by [RFC 9162](https://www.rfc-editor.org/info/rfc9162/). RFC 6962 support is rapidly being phased out[^ctv1_sunset] when I mention technical details in this article, it's safe to assume I'm talking about RFC 9162.

# The Problem

Browsers trust many CAs[^ca_count] and any of those CAs are allowed to issue certificates for any domain[^caa_records]. If an attacker manages to compromise a single CA in a major root store's program, this could lead to a bad day for the internet. 

CT makes issuance publically observable. This means misissuance is still possible, but CT monitors can catch it when it occurs. 


[^DigiNotar]: In 2011 DigiNotar was comprimised, the attackers used their access to issue fradulent certificates for major domains including \*google.com, \*skype.com and update.microsoft.com. The issued certificates were in turn used to target Iranian citizens. This is well documented and worth an online search if you're unfamiliar. 
[^ctv1_sunset]: Last Thursday, November 5th, 2026, [Apple updated](https://groups.google.com/a/chromium.org/g/ct-policy/c/XvCEH84kVXw) their CT program policy to no longer require the use of RFC 6962 compliant CT logs. In turn [google almost immediately announced](https://groups.google.com/a/chromium.org/g/ct-policy/c/Y9t44bJqpkc) they were spinning down their RFC 6962 speaking CT logs. Other operators will follow suit.
[^ca_count]: At time of writing, Google Chrome's root store program lists 44 unique Certificate Authorities. [CCADB](https://www.ccadb.org/resources) provides up to data information on each browser and OS root program.
[^caa_records]: CAA records allow domain owners to specify which CAs are authorized to issue certificates for their domain. The majority of domains do not publish CAA records and since clients don't normally check CAA records, this isn't a perfect solution today, but misissuance is likely to be caught by CT monitors. 
