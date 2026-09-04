-- PLUGGD production beat licensing compliance baseline.
-- Legal text supplied 2026-08-01, corrected to preserve Stripe-only beat licensing.
-- Existing executed contracts keep their immutable legal snapshots.

alter table public.licensing_options
  add column if not exists producer_authorization_text text,
  add column if not exists producer_authorization_version text,
  add column if not exists producer_authorized_by uuid,
  add column if not exists producer_authorized_at timestamptz,
  add column if not exists producer_authorization_ip text,
  add column if not exists producer_authorization_user_agent text;

alter table public.licensing_contracts
  add column if not exists digital_delivery_requested boolean not null default false,
  add column if not exists digital_delivery_consent_text text,
  add column if not exists digital_delivery_consent_version text,
  add column if not exists digital_delivery_consented_at timestamptz,
  add column if not exists digital_delivery_consent_ip text,
  add column if not exists digital_delivery_consent_user_agent text,
  add column if not exists producer_authorization_snapshot jsonb not null default '{}'::jsonb;

alter table public.licensing_contracts
  drop constraint if exists licensing_contracts_delivery_consent_check;
alter table public.licensing_contracts
  add constraint licensing_contracts_delivery_consent_check check (
    digital_delivery_requested = false
    or (
      digital_delivery_consent_text is not null
      and length(trim(digital_delivery_consent_text)) >= 80
      and digital_delivery_consent_version is not null
      and digital_delivery_consented_at is not null
    )
  ) not valid;

comment on column public.licensing_contracts.digital_delivery_requested is
  'Separate express request for immediate digital delivery; never inferred from licence acceptance.';
comment on column public.licensing_contracts.producer_authorization_snapshot is
  'Immutable snapshot of the authenticated producer authorization used to form this licence.';

-- PLUGGD production beat licence templates v1.0
-- Drafted 2026-08-01 for England & Wales baseline.
-- Does not overwrite producer-authored per-user terms; it only fills blank default terms.


UPDATE public.contract_templates
SET
  title = $t$Basic Beat Licence$t$,
  description = $d$Entry-level non-exclusive commercial licence for one New Song.$d$,
  legal_text = $legal$PLUGGD BASIC BEAT LICENCE AGREEMENT — v1.0

EFFECTIVE DATE: {purchase_date}
LICENSOR / PRODUCER: {producer_name} (“Producer”)
LICENSEE / ARTIST: {artist_name} (“Licensee”)
BEAT: {beat_title} (“Beat”)
LICENCE FEE: £{amount} GBP

1. LICENCE TYPE AND GRANT
1.1 The Producer grants the Licensee a personal, worldwide, non-exclusive, non-transferable except as permitted by clause 14, perpetual licence to use the Beat solely to create and commercially exploit one (1) New Song, subject to the limits below.
1.2 The Licensee may record vocals and/or additional instruments over the Beat; edit the Beat as reasonably necessary for arrangement, mixing, mastering, clean versions and radio edits; distribute and stream the New Song; perform it live; and use excerpts to promote the New Song.
1.3 This is a licence, not a sale or assignment of copyright in the Beat. The Producer may continue to license the Beat to others and may later grant an exclusive licence, subject to clause 6.

2. BASIC USAGE LIMITS
The Basic licence permits: (a) up to 100,000 monetised or non-monetised on-demand audio streams in aggregate; (b) up to 5,000 paid downloads, free downloads and physical units in aggregate; (c) one (1) official music video or visualiser, monetised or non-monetised, with up to 100,000 public views in aggregate; (d) live public performances; and (e) social-media promotion of the New Song.

3. BASIC RESTRICTIONS
3.1 No terrestrial or satellite radio broadcast, film/TV/game/advertising synchronisation, or use as production music for a third party without a separate written licence from the Producer.
3.2 The Licensee may not register the Beat or New Song in Content ID or a materially similar fingerprinting system under this non-exclusive licence.
3.3 Before exceeding a cap in clause 2, the Licensee must obtain an upgrade or separate written permission. Lawful exploitation before the cap is not retroactively unauthorised.

4. FILE DELIVERY
The Basic tier includes the MP3 file(s) stated in the Beat listing.

5. PROHIBITED STANDALONE USE
The Licensee may not sell, sublicense, upload, distribute, sample-pack, library-license or otherwise exploit the Beat, stems or substantial portions of them on a standalone basis or in a way intended to substitute for the Beat itself.

6. LATER EXCLUSIVE LICENCE
If the Producer later grants exclusive rights in the Beat, this Basic licence remains valid for the Licensee according to its existing terms. The later exclusive buyer takes subject to this prior licence.

7. OWNERSHIP OF THE NEW SONG AND PUBLISHING
7.1 The Licensee owns the copyright in the new sound recording created by the Licensee using the Beat (the “New Master”), subject always to the rights in the Beat and musical composition licensed under this Agreement. The Producer does not acquire ownership of the New Master merely because the Beat is embodied in it.
7.2 Except for the rights expressly granted by this Agreement, the Producer retains all copyright and other rights in the Beat, including the original Beat sound recording and the Producer-side interest in the underlying musical composition.
7.3 Unless the parties sign a different split sheet or written agreement, the copyright ownership of the musical composition embodied in the New Song is allocated 50% to the Producer side and 50% to the Licensee side. Each side is responsible for allocating its share among its own writers, co-producers or publishers. A later signed split sheet prevails over this default. Any properly disclosed third-party sample or interpolation claim may require the parties to adjust those shares.
7.4 The Licensee may register the New Song with a performing-rights organisation, collection society, publisher or administrator, but must accurately register the Producer-side share and must not claim more than the Licensee-side share.
7.5 No master royalty, producer point or continuing royalty from exploitation of the New Master is payable to the Producer unless the parties separately agree it in writing. Publishing and composition income remains payable according to clause 7.3.

8. CREDIT AND MORAL RIGHTS
8.1 The Licensee must use reasonable efforts to credit the Producer as “Prod. by {producer_name}” (or the Producer’s stated professional credit) in release metadata, video descriptions and other places where production credits are customarily displayed and technically supported.
8.2 Nothing in this Agreement transfers moral rights. The Producer asserts any right to be identified as author/composer to the extent available under applicable law. No party may falsely attribute authorship or subject the other party’s protected work to derogatory treatment.

9. CONTENT ID, FINGERPRINTING AND AUTOMATED CLAIMS
9.1 The Licensee must comply with the Content ID rule stated in the licence tier above. Where registration is prohibited, this includes YouTube Content ID, Meta Rights Manager and materially similar audio-fingerprinting systems. The Licensee must opt out of automatic fingerprinting where reasonably available.
9.2 No party may use automated rights-management tools to claim or block exploitation that is expressly authorised by this Agreement. A party receiving notice of a mistaken claim must act promptly and reasonably to release or correct it.

10. SAMPLES, THIRD-PARTY MATERIAL AND WARRANTIES
10.1 The Producer represents that the Producer owns or controls the rights necessary to grant this licence and has disclosed in the Beat listing or before purchase any known third-party sample, interpolation, loop or other restriction that requires separate clearance for the uses offered.
10.2 The Producer must not knowingly market a Beat as cleared for commercial licensing while concealing a material third-party rights restriction.
10.3 The Licensee is responsible for all lyrics, vocals, performances, artwork and other material added by or on behalf of the Licensee, and represents that those additions do not infringe third-party rights.
10.4 If a disclosed third-party element requires additional clearance, the Licensee must obtain that clearance before the affected exploitation. The Licensee is not responsible under this Agreement for an undisclosed rights defect that the Producer was required to disclose under clauses 10.1–10.2.

11. DELIVERY, PAYMENT AND EFFECTIVE DATE
11.1 This Agreement becomes effective only when (a) the Licensee signs it electronically, and (b) the licence fee is successfully settled through PLUGGD's permitted hosted checkout. If payment is reversed, charged back or cancelled, the licence is suspended unless and until payment is restored, subject to the Licensee’s statutory rights.
11.2 The purchased files and file types are those stated in the selected tier and Beat listing at checkout. The Producer is not required to supply project files, MIDI, stems or alternate mixes unless they are expressly included.
11.3 PLUGGD facilitates contract formation, payment and delivery. The licence itself is between the Producer and the Licensee. Nothing in this clause limits any separate obligation PLUGGD may owe under applicable law or PLUGGD’s platform terms.

12. DIGITAL CONTENT AND CONSUMER RIGHTS
12.1 Nothing in this Agreement excludes or limits rights that cannot lawfully be excluded, including rights under applicable consumer law.
12.2 Where the Licensee is a consumer and asks for downloadable digital content to be supplied during a statutory cancellation period, PLUGGD must obtain the Licensee’s separate express request for immediate supply and acknowledgement of any resulting loss of the cancellation right before the download begins. This clause does not itself constitute that separate consent.
12.3 If digital content is faulty, materially not as described or otherwise fails to meet mandatory statutory standards, the Licensee retains any remedy provided by law.

13. BREACH AND TERMINATION
13.1 A material breach capable of remedy must be remedied within 14 days after written notice. If it is not remedied, the non-breaching party may terminate the licence.
13.2 Deliberate resale or distribution of the Beat substantially on its own, fraudulent payment, or knowing registration of rights contrary to clause 9 may justify immediate suspension or termination where proportionate.
13.3 Termination does not affect accrued payment obligations, ownership of the parties’ pre-existing rights, or lawful exploitation completed before termination. Existing consumer and statutory rights survive.

14. TRANSFERS, LABELS AND DISTRIBUTORS
14.1 The Licensee may authorise distributors, DSPs, social platforms, collection societies, publishers, labels and service providers to exercise the licensed rights solely as necessary to exploit the New Song within this Agreement.
14.2 The Licensee may transfer the New Master to a label or other successor together with the benefit of this Beat licence, provided the successor takes subject to this Agreement. The Beat licence may not be sold or transferred separately from the New Song.

15. ELECTRONIC CONTRACTING AND RECORDS
15.1 The parties agree to electronic contracting and electronic signatures. The Producer’s publication of the Beat with the selected PLUGGD licence offering constitutes the Producer’s authorisation for PLUGGD to generate this Agreement on those published terms. The Licensee’s recorded electronic signature confirms acceptance of this final text.
15.2 PLUGGD may retain the executed text, timestamps, transaction identifiers, IP address and user-agent information as evidence of formation and execution, subject to applicable data-protection law and PLUGGD’s privacy notice.
15.3 The executed legal text stored for this transaction governs. A later change to a template does not amend an already completed licence unless both parties agree in writing.

16. GENERAL
16.1 Entire agreement. This Agreement, the Beat listing terms incorporated at checkout and any later signed split sheet or written amendment constitute the agreement concerning this Beat licence. If there is a conflict, a later document signed by both parties prevails.
16.2 Severability. If a provision is unenforceable, it is to be read down or severed only to the extent necessary, without invalidating the remainder.
16.3 No waiver. A delay in enforcing a right is not a waiver of that right.
16.4 Governing law. This Agreement is governed by the law of England and Wales, except that a consumer retains any mandatory protections and jurisdiction rights available in the country or UK nation where the consumer habitually resides.
16.5 Nothing in this Agreement excludes liability for fraud, fraudulent misrepresentation, death or personal injury caused by negligence, or any liability that cannot lawfully be excluded.

SIGNED ELECTRONICALLY
Producer: {producer_name}
Producer authorisation: recorded separately by PLUGGD against the published licence option
Licensee: {artist_name}
Licence fee: £{amount} GBP
Effective date: {purchase_date}
$legal$,
  features = $f$["One New Song","Up to 100,000 audio streams","Up to 5,000 downloads/physical units","One monetised music video","Live performances","Producer credit required"]$f$::jsonb,
  restrictions = $r$["Non-exclusive","No radio","No third-party sync","No Content ID","Standalone Beat resale prohibited"]$r$::jsonb,
  deliverables = $x$["MP3 as listed","BPM/key where provided","Production credit details"]$x$::jsonb,
  is_active = true,
  updated_at = now()
WHERE template_type = 'basic_lease';

UPDATE public.contract_templates
SET
  title = $t$Premium Beat Licence$t$,
  description = $d$Higher-cap non-exclusive commercial licence with radio rights.$d$,
  legal_text = $legal$PLUGGD PREMIUM BEAT LICENCE AGREEMENT — v1.0

EFFECTIVE DATE: {purchase_date}
LICENSOR / PRODUCER: {producer_name} (“Producer”)
LICENSEE / ARTIST: {artist_name} (“Licensee”)
BEAT: {beat_title} (“Beat”)
LICENCE FEE: £{amount} GBP

1. LICENCE TYPE AND GRANT
1.1 The Producer grants the Licensee a worldwide, non-exclusive, non-transferable except as permitted by clause 14, perpetual licence to use the Beat solely to create and commercially exploit one (1) New Song, subject to the limits below.
1.2 The Licensee may record vocals and/or additional instruments; edit and arrange the Beat as reasonably necessary; distribute, stream and monetise the New Song; perform it publicly; create promotional content; and permit distributors and labels to exploit the New Song within this Agreement.
1.3 This is a licence, not a sale or assignment of copyright in the Beat. The Producer may continue licensing the Beat and may later grant an exclusive licence, subject to clause 6.

2. PREMIUM USAGE LIMITS
The Premium licence permits: (a) up to 1,000,000 monetised or non-monetised on-demand audio streams in aggregate; (b) up to 50,000 paid downloads, free downloads and physical units in aggregate; (c) up to two (2) official monetised music videos or visualisers with up to 1,000,000 public views in aggregate; (d) unlimited live public performances; (e) broadcast of the New Song on radio and internet-radio services; and (f) monetised social-media promotion of the New Song.

3. PREMIUM RESTRICTIONS
3.1 No film, television, game, trailer, brand advertising or other third-party synchronisation without a separate written sync approval from the Producer.
3.2 The Licensee may not register the Beat or New Song in Content ID or a materially similar fingerprinting system under this non-exclusive licence.
3.3 Before exceeding a cap in clause 2, the Licensee must obtain an upgrade or separate written permission. Lawful exploitation before the cap is not retroactively unauthorised.

4. FILE DELIVERY
The Premium tier includes the MP3 and WAV file(s) stated in the Beat listing. Stems, trackouts, MIDI or project files are included only if the listing expressly says so.

5. PROHIBITED STANDALONE USE
The Licensee may not sell, sublicense, upload, distribute, sample-pack, library-license or otherwise exploit the Beat, stems or substantial portions of them on a standalone basis or in a way intended to substitute for the Beat itself.

6. LATER EXCLUSIVE LICENCE
If the Producer later grants exclusive rights in the Beat, this Premium licence remains valid for the Licensee according to its existing terms. The later exclusive buyer takes subject to this prior licence.

7. OWNERSHIP OF THE NEW SONG AND PUBLISHING
7.1 The Licensee owns the copyright in the new sound recording created by the Licensee using the Beat (the “New Master”), subject always to the rights in the Beat and musical composition licensed under this Agreement. The Producer does not acquire ownership of the New Master merely because the Beat is embodied in it.
7.2 Except for the rights expressly granted by this Agreement, the Producer retains all copyright and other rights in the Beat, including the original Beat sound recording and the Producer-side interest in the underlying musical composition.
7.3 Unless the parties sign a different split sheet or written agreement, the copyright ownership of the musical composition embodied in the New Song is allocated 50% to the Producer side and 50% to the Licensee side. Each side is responsible for allocating its share among its own writers, co-producers or publishers. A later signed split sheet prevails over this default. Any properly disclosed third-party sample or interpolation claim may require the parties to adjust those shares.
7.4 The Licensee may register the New Song with a performing-rights organisation, collection society, publisher or administrator, but must accurately register the Producer-side share and must not claim more than the Licensee-side share.
7.5 No master royalty, producer point or continuing royalty from exploitation of the New Master is payable to the Producer unless the parties separately agree it in writing. Publishing and composition income remains payable according to clause 7.3.

8. CREDIT AND MORAL RIGHTS
8.1 The Licensee must use reasonable efforts to credit the Producer as “Prod. by {producer_name}” (or the Producer’s stated professional credit) in release metadata, video descriptions and other places where production credits are customarily displayed and technically supported.
8.2 Nothing in this Agreement transfers moral rights. The Producer asserts any right to be identified as author/composer to the extent available under applicable law. No party may falsely attribute authorship or subject the other party’s protected work to derogatory treatment.

9. CONTENT ID, FINGERPRINTING AND AUTOMATED CLAIMS
9.1 The Licensee must comply with the Content ID rule stated in the licence tier above. Where registration is prohibited, this includes YouTube Content ID, Meta Rights Manager and materially similar audio-fingerprinting systems. The Licensee must opt out of automatic fingerprinting where reasonably available.
9.2 No party may use automated rights-management tools to claim or block exploitation that is expressly authorised by this Agreement. A party receiving notice of a mistaken claim must act promptly and reasonably to release or correct it.

10. SAMPLES, THIRD-PARTY MATERIAL AND WARRANTIES
10.1 The Producer represents that the Producer owns or controls the rights necessary to grant this licence and has disclosed in the Beat listing or before purchase any known third-party sample, interpolation, loop or other restriction that requires separate clearance for the uses offered.
10.2 The Producer must not knowingly market a Beat as cleared for commercial licensing while concealing a material third-party rights restriction.
10.3 The Licensee is responsible for all lyrics, vocals, performances, artwork and other material added by or on behalf of the Licensee, and represents that those additions do not infringe third-party rights.
10.4 If a disclosed third-party element requires additional clearance, the Licensee must obtain that clearance before the affected exploitation. The Licensee is not responsible under this Agreement for an undisclosed rights defect that the Producer was required to disclose under clauses 10.1–10.2.

11. DELIVERY, PAYMENT AND EFFECTIVE DATE
11.1 This Agreement becomes effective only when (a) the Licensee signs it electronically, and (b) the licence fee is successfully settled through PLUGGD's permitted hosted checkout. If payment is reversed, charged back or cancelled, the licence is suspended unless and until payment is restored, subject to the Licensee’s statutory rights.
11.2 The purchased files and file types are those stated in the selected tier and Beat listing at checkout. The Producer is not required to supply project files, MIDI, stems or alternate mixes unless they are expressly included.
11.3 PLUGGD facilitates contract formation, payment and delivery. The licence itself is between the Producer and the Licensee. Nothing in this clause limits any separate obligation PLUGGD may owe under applicable law or PLUGGD’s platform terms.

12. DIGITAL CONTENT AND CONSUMER RIGHTS
12.1 Nothing in this Agreement excludes or limits rights that cannot lawfully be excluded, including rights under applicable consumer law.
12.2 Where the Licensee is a consumer and asks for downloadable digital content to be supplied during a statutory cancellation period, PLUGGD must obtain the Licensee’s separate express request for immediate supply and acknowledgement of any resulting loss of the cancellation right before the download begins. This clause does not itself constitute that separate consent.
12.3 If digital content is faulty, materially not as described or otherwise fails to meet mandatory statutory standards, the Licensee retains any remedy provided by law.

13. BREACH AND TERMINATION
13.1 A material breach capable of remedy must be remedied within 14 days after written notice. If it is not remedied, the non-breaching party may terminate the licence.
13.2 Deliberate resale or distribution of the Beat substantially on its own, fraudulent payment, or knowing registration of rights contrary to clause 9 may justify immediate suspension or termination where proportionate.
13.3 Termination does not affect accrued payment obligations, ownership of the parties’ pre-existing rights, or lawful exploitation completed before termination. Existing consumer and statutory rights survive.

14. TRANSFERS, LABELS AND DISTRIBUTORS
14.1 The Licensee may authorise distributors, DSPs, social platforms, collection societies, publishers, labels and service providers to exercise the licensed rights solely as necessary to exploit the New Song within this Agreement.
14.2 The Licensee may transfer the New Master to a label or other successor together with the benefit of this Beat licence, provided the successor takes subject to this Agreement. The Beat licence may not be sold or transferred separately from the New Song.

15. ELECTRONIC CONTRACTING AND RECORDS
15.1 The parties agree to electronic contracting and electronic signatures. The Producer’s publication of the Beat with the selected PLUGGD licence offering constitutes the Producer’s authorisation for PLUGGD to generate this Agreement on those published terms. The Licensee’s recorded electronic signature confirms acceptance of this final text.
15.2 PLUGGD may retain the executed text, timestamps, transaction identifiers, IP address and user-agent information as evidence of formation and execution, subject to applicable data-protection law and PLUGGD’s privacy notice.
15.3 The executed legal text stored for this transaction governs. A later change to a template does not amend an already completed licence unless both parties agree in writing.

16. GENERAL
16.1 Entire agreement. This Agreement, the Beat listing terms incorporated at checkout and any later signed split sheet or written amendment constitute the agreement concerning this Beat licence. If there is a conflict, a later document signed by both parties prevails.
16.2 Severability. If a provision is unenforceable, it is to be read down or severed only to the extent necessary, without invalidating the remainder.
16.3 No waiver. A delay in enforcing a right is not a waiver of that right.
16.4 Governing law. This Agreement is governed by the law of England and Wales, except that a consumer retains any mandatory protections and jurisdiction rights available in the country or UK nation where the consumer habitually resides.
16.5 Nothing in this Agreement excludes liability for fraud, fraudulent misrepresentation, death or personal injury caused by negligence, or any liability that cannot lawfully be excluded.

SIGNED ELECTRONICALLY
Producer: {producer_name}
Producer authorisation: recorded separately by PLUGGD against the published licence option
Licensee: {artist_name}
Licence fee: £{amount} GBP
Effective date: {purchase_date}
$legal$,
  features = $f$["One New Song","Up to 1,000,000 audio streams","Up to 50,000 downloads/physical units","Two monetised music videos","Radio broadcast","Unlimited live performances"]$f$::jsonb,
  restrictions = $r$["Non-exclusive","No third-party sync without separate approval","No Content ID","Standalone Beat resale prohibited"]$r$::jsonb,
  deliverables = $x$["MP3 and WAV as listed","Stems only where listed","BPM/key where provided"]$x$::jsonb,
  is_active = true,
  updated_at = now()
WHERE template_type = 'premium_lease';

UPDATE public.contract_templates
SET
  title = $t$Unlimited Beat Licence$t$,
  description = $d$No numerical exploitation caps; non-exclusive with Producer-controlled sync approval.$d$,
  legal_text = $legal$PLUGGD UNLIMITED BEAT LICENCE AGREEMENT — v1.0

EFFECTIVE DATE: {purchase_date}
LICENSOR / PRODUCER: {producer_name} (“Producer”)
LICENSEE / ARTIST: {artist_name} (“Licensee”)
BEAT: {beat_title} (“Beat”)
LICENCE FEE: £{amount} GBP

1. LICENCE TYPE AND GRANT
1.1 The Producer grants the Licensee a worldwide, non-exclusive, non-transferable except as permitted by clause 14, perpetual licence to use the Beat solely to create and commercially exploit one (1) New Song.
1.2 Subject to the restrictions below, there is no numerical cap on audio streams, downloads, physical units, music-video views, live performances or radio broadcasts of the New Song.
1.3 The Licensee may edit and arrange the Beat as reasonably necessary; monetise the New Song and related audiovisual content; distribute through labels and distributors; and exploit the New Song worldwide in all media now known or later developed.
1.4 This is a licence, not a sale or assignment of copyright in the Beat. The Producer may continue licensing the Beat and may later grant an exclusive licence, subject to clause 6.

2. SYNCHRONISATION
2.1 The Unlimited licence includes the Producer’s approval, to the extent of the Producer-controlled rights only, to synchronise the New Song in film, television, games, trailers, online content and advertising. The Licensee must obtain any approvals required from other rightsholders.
2.2 Unless the parties agree otherwise in writing, any direct synchronisation fee attributable to the musical composition is divided according to the composition ownership percentages in clause 7.3. Any master-use fee for the New Master belongs to the owner of the New Master.

3. CONTENT ID
The Licensee may not register the Beat or New Song in Content ID or a materially similar fingerprinting system under this non-exclusive licence unless the Producer gives separate written permission and an effective whitelisting process protects other valid licensees.

4. FILE DELIVERY
The Unlimited tier includes MP3, WAV and stems/trackouts where stated in the Beat listing. MIDI, project files and alternate mixes are included only if expressly listed.

5. PROHIBITED STANDALONE USE
The Licensee may not sell, sublicense, upload, distribute, sample-pack, library-license or otherwise exploit the Beat, stems or substantial portions of them on a standalone basis or in a way intended to substitute for the Beat itself.

6. LATER EXCLUSIVE LICENCE
If the Producer later grants exclusive rights in the Beat, this Unlimited licence remains valid for the Licensee according to its existing terms. The later exclusive buyer takes subject to this prior licence.

7. OWNERSHIP OF THE NEW SONG AND PUBLISHING
7.1 The Licensee owns the copyright in the new sound recording created by the Licensee using the Beat (the “New Master”), subject always to the rights in the Beat and musical composition licensed under this Agreement. The Producer does not acquire ownership of the New Master merely because the Beat is embodied in it.
7.2 Except for the rights expressly granted by this Agreement, the Producer retains all copyright and other rights in the Beat, including the original Beat sound recording and the Producer-side interest in the underlying musical composition.
7.3 Unless the parties sign a different split sheet or written agreement, the copyright ownership of the musical composition embodied in the New Song is allocated 50% to the Producer side and 50% to the Licensee side. Each side is responsible for allocating its share among its own writers, co-producers or publishers. A later signed split sheet prevails over this default. Any properly disclosed third-party sample or interpolation claim may require the parties to adjust those shares.
7.4 The Licensee may register the New Song with a performing-rights organisation, collection society, publisher or administrator, but must accurately register the Producer-side share and must not claim more than the Licensee-side share.
7.5 No master royalty, producer point or continuing royalty from exploitation of the New Master is payable to the Producer unless the parties separately agree it in writing. Publishing and composition income remains payable according to clause 7.3.

8. CREDIT AND MORAL RIGHTS
8.1 The Licensee must use reasonable efforts to credit the Producer as “Prod. by {producer_name}” (or the Producer’s stated professional credit) in release metadata, video descriptions and other places where production credits are customarily displayed and technically supported.
8.2 Nothing in this Agreement transfers moral rights. The Producer asserts any right to be identified as author/composer to the extent available under applicable law. No party may falsely attribute authorship or subject the other party’s protected work to derogatory treatment.

9. CONTENT ID, FINGERPRINTING AND AUTOMATED CLAIMS
9.1 The Licensee must comply with the Content ID rule stated in the licence tier above. Where registration is prohibited, this includes YouTube Content ID, Meta Rights Manager and materially similar audio-fingerprinting systems. The Licensee must opt out of automatic fingerprinting where reasonably available.
9.2 No party may use automated rights-management tools to claim or block exploitation that is expressly authorised by this Agreement. A party receiving notice of a mistaken claim must act promptly and reasonably to release or correct it.

10. SAMPLES, THIRD-PARTY MATERIAL AND WARRANTIES
10.1 The Producer represents that the Producer owns or controls the rights necessary to grant this licence and has disclosed in the Beat listing or before purchase any known third-party sample, interpolation, loop or other restriction that requires separate clearance for the uses offered.
10.2 The Producer must not knowingly market a Beat as cleared for commercial licensing while concealing a material third-party rights restriction.
10.3 The Licensee is responsible for all lyrics, vocals, performances, artwork and other material added by or on behalf of the Licensee, and represents that those additions do not infringe third-party rights.
10.4 If a disclosed third-party element requires additional clearance, the Licensee must obtain that clearance before the affected exploitation. The Licensee is not responsible under this Agreement for an undisclosed rights defect that the Producer was required to disclose under clauses 10.1–10.2.

11. DELIVERY, PAYMENT AND EFFECTIVE DATE
11.1 This Agreement becomes effective only when (a) the Licensee signs it electronically, and (b) the licence fee is successfully settled through PLUGGD's permitted hosted checkout. If payment is reversed, charged back or cancelled, the licence is suspended unless and until payment is restored, subject to the Licensee’s statutory rights.
11.2 The purchased files and file types are those stated in the selected tier and Beat listing at checkout. The Producer is not required to supply project files, MIDI, stems or alternate mixes unless they are expressly included.
11.3 PLUGGD facilitates contract formation, payment and delivery. The licence itself is between the Producer and the Licensee. Nothing in this clause limits any separate obligation PLUGGD may owe under applicable law or PLUGGD’s platform terms.

12. DIGITAL CONTENT AND CONSUMER RIGHTS
12.1 Nothing in this Agreement excludes or limits rights that cannot lawfully be excluded, including rights under applicable consumer law.
12.2 Where the Licensee is a consumer and asks for downloadable digital content to be supplied during a statutory cancellation period, PLUGGD must obtain the Licensee’s separate express request for immediate supply and acknowledgement of any resulting loss of the cancellation right before the download begins. This clause does not itself constitute that separate consent.
12.3 If digital content is faulty, materially not as described or otherwise fails to meet mandatory statutory standards, the Licensee retains any remedy provided by law.

13. BREACH AND TERMINATION
13.1 A material breach capable of remedy must be remedied within 14 days after written notice. If it is not remedied, the non-breaching party may terminate the licence.
13.2 Deliberate resale or distribution of the Beat substantially on its own, fraudulent payment, or knowing registration of rights contrary to clause 9 may justify immediate suspension or termination where proportionate.
13.3 Termination does not affect accrued payment obligations, ownership of the parties’ pre-existing rights, or lawful exploitation completed before termination. Existing consumer and statutory rights survive.

14. TRANSFERS, LABELS AND DISTRIBUTORS
14.1 The Licensee may authorise distributors, DSPs, social platforms, collection societies, publishers, labels and service providers to exercise the licensed rights solely as necessary to exploit the New Song within this Agreement.
14.2 The Licensee may transfer the New Master to a label or other successor together with the benefit of this Beat licence, provided the successor takes subject to this Agreement. The Beat licence may not be sold or transferred separately from the New Song.

15. ELECTRONIC CONTRACTING AND RECORDS
15.1 The parties agree to electronic contracting and electronic signatures. The Producer’s publication of the Beat with the selected PLUGGD licence offering constitutes the Producer’s authorisation for PLUGGD to generate this Agreement on those published terms. The Licensee’s recorded electronic signature confirms acceptance of this final text.
15.2 PLUGGD may retain the executed text, timestamps, transaction identifiers, IP address and user-agent information as evidence of formation and execution, subject to applicable data-protection law and PLUGGD’s privacy notice.
15.3 The executed legal text stored for this transaction governs. A later change to a template does not amend an already completed licence unless both parties agree in writing.

16. GENERAL
16.1 Entire agreement. This Agreement, the Beat listing terms incorporated at checkout and any later signed split sheet or written amendment constitute the agreement concerning this Beat licence. If there is a conflict, a later document signed by both parties prevails.
16.2 Severability. If a provision is unenforceable, it is to be read down or severed only to the extent necessary, without invalidating the remainder.
16.3 No waiver. A delay in enforcing a right is not a waiver of that right.
16.4 Governing law. This Agreement is governed by the law of England and Wales, except that a consumer retains any mandatory protections and jurisdiction rights available in the country or UK nation where the consumer habitually resides.
16.5 Nothing in this Agreement excludes liability for fraud, fraudulent misrepresentation, death or personal injury caused by negligence, or any liability that cannot lawfully be excluded.

SIGNED ELECTRONICALLY
Producer: {producer_name}
Producer authorisation: recorded separately by PLUGGD against the published licence option
Licensee: {artist_name}
Licence fee: £{amount} GBP
Effective date: {purchase_date}
$legal$,
  features = $f$["One New Song","Unlimited streams and units","Unlimited monetised videos","Radio and live performance","Producer-controlled sync approval","Worldwide perpetual use"]$f$::jsonb,
  restrictions = $r$["Non-exclusive","No Content ID without written permission","Standalone Beat resale prohibited","Third-party rights still require clearance"]$r$::jsonb,
  deliverables = $x$["MP3 and WAV","Stems/trackouts where listed","MIDI/project files only where listed"]$x$::jsonb,
  is_active = true,
  updated_at = now()
WHERE template_type = 'unlimited_lease';

UPDATE public.contract_templates
SET
  title = $t$Exclusive Beat Licence$t$,
  description = $d$Exclusive future Beat licence with prior non-exclusive licences preserved.$d$,
  legal_text = $legal$PLUGGD EXCLUSIVE BEAT LICENCE AGREEMENT — v1.0

EFFECTIVE DATE: {purchase_date}
LICENSOR / PRODUCER: {producer_name} (“Producer”)
EXCLUSIVE LICENSEE / ARTIST: {artist_name} (“Licensee”)
BEAT: {beat_title} (“Beat”)
LICENCE FEE: £{amount} GBP

1. EXCLUSIVE LICENCE
1.1 Upon successful payment, the Producer grants the Licensee a worldwide, exclusive, perpetual licence to use the Beat to create and commercially exploit one (1) New Song in all media now known or later developed, subject to prior licences under clause 6 and the rights reserved below.
1.2 The licence includes unlimited streams, downloads, physical units, videos, public performances, radio broadcasts, monetisation, label distribution and synchronisation of the New Song. The Licensee may edit and arrange the Beat as reasonably necessary for the New Song.
1.3 From the Effective Date the Producer must not issue any new licence of the Beat to another party and must remove the Beat from sale/licensing on PLUGGD and other controlled storefronts within a reasonable period. The Producer may retain archival copies and use short excerpts for a non-commercial production portfolio, provided that use does not compete with or imply a new licence of the Beat.
1.4 This Agreement is an exclusive licence, not an assignment of the Producer’s copyright or publishing share. Any transfer of copyright ownership or publishing beyond the licence granted here requires a separate written instrument signed by the relevant copyright owner.

2. SYNCHRONISATION
2.1 The Producer approves, to the extent of Producer-controlled rights, synchronisation of the New Song in film, television, games, trailers, online content and advertising. The Licensee must clear any other rightsholders.
2.2 Unless the parties agree otherwise in writing, any direct synchronisation fee attributable to the musical composition is divided according to clause 7.3. Any master-use fee for the New Master belongs to the owner of the New Master.

3. CONTENT ID
3.1 After the Effective Date the Licensee may register the New Song, but not the unaltered standalone Beat, with Content ID or materially similar fingerprinting services.
3.2 The Licensee must respect all prior licences described in clause 6, whitelist known authorised uses where reasonably possible, and promptly release claims against exploitation permitted by a prior licence.

4. FILE DELIVERY
The Exclusive tier includes the MP3, WAV and stems/trackouts stated in the Beat listing. MIDI, DAW project files and other source materials are included only if expressly listed at checkout.

5. PROHIBITED STANDALONE RESALE
The Licensee may not resell or distribute the Beat, stems or substantial portions of them as a standalone beat, template, sample pack, stock-music item or production library asset. This does not restrict exploitation of the New Song.

6. PRIOR LICENCES
6.1 Any non-exclusive licence validly granted before the Effective Date remains in force according to its original terms. The exclusive licence granted here is subject to those existing licences.
6.2 The Licensee must not issue takedowns, Content ID claims or infringement allegations against uses that are demonstrably authorised by a prior licence. The Producer must not renew, enlarge or replace a prior licence after the Effective Date except where legally required to correct an administrative error, without the Licensee’s written consent.

7. OWNERSHIP OF THE NEW SONG AND PUBLISHING
7.1 The Licensee owns the copyright in the new sound recording created by the Licensee using the Beat (the “New Master”), subject always to the rights in the Beat and musical composition licensed under this Agreement. The Producer does not acquire ownership of the New Master merely because the Beat is embodied in it.
7.2 Except for the rights expressly granted by this Agreement, the Producer retains all copyright and other rights in the Beat, including the original Beat sound recording and the Producer-side interest in the underlying musical composition.
7.3 Unless the parties sign a different split sheet or written agreement, the copyright ownership of the musical composition embodied in the New Song is allocated 50% to the Producer side and 50% to the Licensee side. Each side is responsible for allocating its share among its own writers, co-producers or publishers. A later signed split sheet prevails over this default. Any properly disclosed third-party sample or interpolation claim may require the parties to adjust those shares.
7.4 The Licensee may register the New Song with a performing-rights organisation, collection society, publisher or administrator, but must accurately register the Producer-side share and must not claim more than the Licensee-side share.
7.5 No master royalty, producer point or continuing royalty from exploitation of the New Master is payable to the Producer unless the parties separately agree it in writing. Publishing and composition income remains payable according to clause 7.3.

8. CREDIT AND MORAL RIGHTS
8.1 The Licensee must use reasonable efforts to credit the Producer as “Prod. by {producer_name}” (or the Producer’s stated professional credit) in release metadata, video descriptions and other places where production credits are customarily displayed and technically supported.
8.2 Nothing in this Agreement transfers moral rights. The Producer asserts any right to be identified as author/composer to the extent available under applicable law. No party may falsely attribute authorship or subject the other party’s protected work to derogatory treatment.

9. CONTENT ID, FINGERPRINTING AND AUTOMATED CLAIMS
9.1 The Licensee must comply with the Content ID rule stated in the licence tier above. Where registration is prohibited, this includes YouTube Content ID, Meta Rights Manager and materially similar audio-fingerprinting systems. The Licensee must opt out of automatic fingerprinting where reasonably available.
9.2 No party may use automated rights-management tools to claim or block exploitation that is expressly authorised by this Agreement. A party receiving notice of a mistaken claim must act promptly and reasonably to release or correct it.

10. SAMPLES, THIRD-PARTY MATERIAL AND WARRANTIES
10.1 The Producer represents that the Producer owns or controls the rights necessary to grant this licence and has disclosed in the Beat listing or before purchase any known third-party sample, interpolation, loop or other restriction that requires separate clearance for the uses offered.
10.2 The Producer must not knowingly market a Beat as cleared for commercial licensing while concealing a material third-party rights restriction.
10.3 The Licensee is responsible for all lyrics, vocals, performances, artwork and other material added by or on behalf of the Licensee, and represents that those additions do not infringe third-party rights.
10.4 If a disclosed third-party element requires additional clearance, the Licensee must obtain that clearance before the affected exploitation. The Licensee is not responsible under this Agreement for an undisclosed rights defect that the Producer was required to disclose under clauses 10.1–10.2.

11. DELIVERY, PAYMENT AND EFFECTIVE DATE
11.1 This Agreement becomes effective only when (a) the Licensee signs it electronically, and (b) the licence fee is successfully settled through PLUGGD's permitted hosted checkout. If payment is reversed, charged back or cancelled, the licence is suspended unless and until payment is restored, subject to the Licensee’s statutory rights.
11.2 The purchased files and file types are those stated in the selected tier and Beat listing at checkout. The Producer is not required to supply project files, MIDI, stems or alternate mixes unless they are expressly included.
11.3 PLUGGD facilitates contract formation, payment and delivery. The licence itself is between the Producer and the Licensee. Nothing in this clause limits any separate obligation PLUGGD may owe under applicable law or PLUGGD’s platform terms.

12. DIGITAL CONTENT AND CONSUMER RIGHTS
12.1 Nothing in this Agreement excludes or limits rights that cannot lawfully be excluded, including rights under applicable consumer law.
12.2 Where the Licensee is a consumer and asks for downloadable digital content to be supplied during a statutory cancellation period, PLUGGD must obtain the Licensee’s separate express request for immediate supply and acknowledgement of any resulting loss of the cancellation right before the download begins. This clause does not itself constitute that separate consent.
12.3 If digital content is faulty, materially not as described or otherwise fails to meet mandatory statutory standards, the Licensee retains any remedy provided by law.

13. BREACH AND TERMINATION
13.1 A material breach capable of remedy must be remedied within 14 days after written notice. If it is not remedied, the non-breaching party may terminate the licence.
13.2 Deliberate resale or distribution of the Beat substantially on its own, fraudulent payment, or knowing registration of rights contrary to clause 9 may justify immediate suspension or termination where proportionate.
13.3 Termination does not affect accrued payment obligations, ownership of the parties’ pre-existing rights, or lawful exploitation completed before termination. Existing consumer and statutory rights survive.

14. TRANSFERS, LABELS AND DISTRIBUTORS
14.1 The Licensee may authorise distributors, DSPs, social platforms, collection societies, publishers, labels and service providers to exercise the licensed rights solely as necessary to exploit the New Song within this Agreement.
14.2 The Licensee may transfer the New Master to a label or other successor together with the benefit of this Beat licence, provided the successor takes subject to this Agreement. The Beat licence may not be sold or transferred separately from the New Song.

15. ELECTRONIC CONTRACTING AND RECORDS
15.1 The parties agree to electronic contracting and electronic signatures. The Producer’s publication of the Beat with the selected PLUGGD licence offering constitutes the Producer’s authorisation for PLUGGD to generate this Agreement on those published terms. The Licensee’s recorded electronic signature confirms acceptance of this final text.
15.2 PLUGGD may retain the executed text, timestamps, transaction identifiers, IP address and user-agent information as evidence of formation and execution, subject to applicable data-protection law and PLUGGD’s privacy notice.
15.3 The executed legal text stored for this transaction governs. A later change to a template does not amend an already completed licence unless both parties agree in writing.

16. GENERAL
16.1 Entire agreement. This Agreement, the Beat listing terms incorporated at checkout and any later signed split sheet or written amendment constitute the agreement concerning this Beat licence. If there is a conflict, a later document signed by both parties prevails.
16.2 Severability. If a provision is unenforceable, it is to be read down or severed only to the extent necessary, without invalidating the remainder.
16.3 No waiver. A delay in enforcing a right is not a waiver of that right.
16.4 Governing law. This Agreement is governed by the law of England and Wales, except that a consumer retains any mandatory protections and jurisdiction rights available in the country or UK nation where the consumer habitually resides.
16.5 Nothing in this Agreement excludes liability for fraud, fraudulent misrepresentation, death or personal injury caused by negligence, or any liability that cannot lawfully be excluded.

SIGNED ELECTRONICALLY
Producer: {producer_name}
Producer authorisation: recorded separately by PLUGGD against the published licence option
Licensee: {artist_name}
Licence fee: £{amount} GBP
Effective date: {purchase_date}
$legal$,
  features = $f$["Exclusive future Beat use","Unlimited commercial exploitation","Producer-controlled sync approval","New Master owned by Licensee","Content ID for New Song subject to prior licences","No future Beat licences by Producer"]$f$::jsonb,
  restrictions = $r$["Prior licences remain valid","Producer retains default composition share","No standalone Beat resale","Copyright assignment requires separate signed instrument"]$r$::jsonb,
  deliverables = $x$["MP3 and WAV","Stems/trackouts where listed","Other source files only where listed"]$x$::jsonb,
  is_active = true,
  updated_at = now()
WHERE template_type = 'exclusive_rights';

-- Preserve any producer-written terms. Fill only null/blank defaults.
UPDATE public.license_templates
SET terms = $terms$Worldwide, perpetual non-exclusive licence for one New Song; up to 100,000 audio streams and 5,000 downloads/physical units; one monetised music video; no radio, third-party sync or Content ID; Producer credit required; standalone Beat resale prohibited.$terms$, updated_at = now()
WHERE lower(trim(license_type)) IN ('basic', 'basic_lease')
  AND (terms IS NULL OR length(trim(terms)) = 0);

UPDATE public.license_templates
SET terms = $terms$Worldwide, perpetual non-exclusive licence for one New Song; up to 1,000,000 audio streams and 50,000 downloads/physical units; two monetised music videos; radio permitted; no third-party sync or Content ID; Producer credit required; standalone Beat resale prohibited.$terms$, updated_at = now()
WHERE lower(trim(license_type)) IN ('premium', 'premium_lease')
  AND (terms IS NULL OR length(trim(terms)) = 0);

UPDATE public.license_templates
SET terms = $terms$Worldwide, perpetual non-exclusive licence for one New Song with no numerical stream, unit, video, radio or live-performance caps; Producer-controlled sync approval included; Content ID requires separate permission; standalone Beat resale prohibited.$terms$, updated_at = now()
WHERE lower(trim(license_type)) IN ('unlimited', 'unlimited_lease')
  AND (terms IS NULL OR length(trim(terms)) = 0);

UPDATE public.license_templates
SET terms = $terms$Worldwide, perpetual exclusive licence for future Beat use; prior valid licences survive; unlimited exploitation and Producer-controlled sync approval; Licensee owns the New Master; Producer retains the default composition share unless a later signed split sheet changes it; no standalone Beat resale.$terms$, updated_at = now()
WHERE lower(trim(license_type)) IN ('exclusive', 'exclusive_rights')
  AND (terms IS NULL OR length(trim(terms)) = 0);

-- Exclusive offerings require a fresh, authenticated producer authorization.
-- Existing offers fail closed until the creator reviews and authorizes them.
update public.licensing_options
set is_available = false,
    updated_at = now()
where lower(trim(license_type)) = 'exclusive_rights'
  and (
    producer_authorized_at is null
    or producer_authorized_by is null
    or producer_authorization_version is null
    or producer_authorization_text is null
  );

-- Fail the migration if a production template was missed or remains incomplete.
do $$
declare
  missing_count integer;
begin
  select count(*) into missing_count
  from public.contract_templates
  where template_type in ('basic_lease','premium_lease','unlimited_lease','exclusive_rights')
    and (
      not is_active
      or length(trim(legal_text)) < 2500
      or lower(legal_text) like '%full legal text continues%'
      or lower(legal_text) like '%additional legal terms continue%'
      or lower(legal_text) like '%valid pluggd credits%'
    );
  if missing_count <> 0 then
    raise exception 'Production beat licence template verification failed for % template(s)', missing_count;
  end if;
end
$$;
