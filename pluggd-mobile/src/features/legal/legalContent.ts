export type NativeLegalBlock =
  | { type: 'paragraph'; text: string; tone?: 'default' | 'strong' | 'muted' | 'italic' }
  | { type: 'bullets'; items: string[]; heading?: string; intro?: string; variant?: 'default' | 'danger-grid' }
  | { type: 'labelled-list'; items: Array<{ label: string; text: string }> };

export type NativeLegalDocument = {
  locale: 'en-GB';
  slug: 'terms' | 'privacy';
  title: string;
  lastUpdated: string;
  intro: NativeLegalBlock[];
  sections: Array<{ number: string; title: string; blocks: NativeLegalBlock[] }>;
  contact?: { number?: string; title: string; body: string; emailLabel: string; email: string };
};

const supportEmail = 'support@pluggd.fm';

export const TERMS_DOCUMENT: NativeLegalDocument = {
  locale: 'en-GB',
  slug: 'terms',
  title: 'Terms of Service',
  lastUpdated: 'Last updated: 08 Dec 2025',
  intro: [
    {
      type: 'paragraph',
      text: 'Please read these Terms of Service ("Terms") carefully before using Pluggd. By creating an account or using any part of the Pluggd platform, you agree to be bound by these Terms.',
    },
    { type: 'paragraph', tone: 'strong', text: 'If you do not agree to these Terms, do not use the Services.' },
  ],
  sections: [
    {
      number: '1',
      title: 'Who we are',
      blocks: [
        {
          type: 'paragraph',
          text: 'Pluggd is a creator-first music platform operated by Pluggd Ltd ("Pluggd", "we", "us", "our"). We provide tools for creators, teams and fans to publish, sell, license, stream, gift, subscribe to and otherwise interact with music and related content (the "Services").',
        },
      ],
    },
    {
      number: '2',
      title: 'Who these Terms apply to',
      blocks: [
        { type: 'paragraph', text: 'These Terms apply to:' },
        {
          type: 'labelled-list',
          items: [
            { label: 'Creators and Teams', text: 'Artists, producers, labels, collectives, engineers, educators and their teams using Pluggd to host, sell, license or promote content and offers.' },
            { label: 'Fans', text: 'People using Pluggd to discover, stream, purchase or otherwise access content and offers.' },
            { label: 'Visitors', text: 'Anyone browsing Pluggd without an account.' },
          ],
        },
        {
          type: 'paragraph',
          text: 'Additional terms or policies may apply to specific features (for example payouts, integrations, promotions). If there is a conflict, those specific terms will govern to the extent of the conflict.',
        },
      ],
    },
    {
      number: '3',
      title: 'Eligibility',
      blocks: [
        { type: 'paragraph', text: 'To use Pluggd, you must:' },
        {
          type: 'bullets',
          items: [
            'Be at least 16 years old (or the age of digital consent in your jurisdiction).',
            'Have the legal capacity to enter into a binding contract.',
            'Comply with all applicable laws and regulations in your jurisdiction.',
          ],
        },
        {
          type: 'paragraph',
          text: 'Creators accepting payments and payouts must also pass any necessary KYC/AML checks and provide accurate tax and business information as required by our payment providers and relevant authorities.',
        },
      ],
    },
    {
      number: '4',
      title: 'Your account',
      blocks: [
        { type: 'paragraph', text: 'You are responsible for:' },
        {
          type: 'bullets',
          items: [
            'Keeping your login credentials secure;',
            'All activity that occurs under your account;',
            'Providing accurate and up-to-date information.',
          ],
        },
        { type: 'paragraph', text: 'If you suspect unauthorised access to your account, you must notify us immediately at support@pluggd.fm.' },
        { type: 'paragraph', text: 'We reserve the right to suspend or terminate accounts that violate these Terms, our policies, or applicable law.' },
      ],
    },
    {
      number: '5',
      title: 'Your content and rights',
      blocks: [
        {
          type: 'paragraph',
          text: 'As a creator, you may upload or connect content including but not limited to: audio, stems, sound packs, artwork, video, text, metadata, course materials, live streams, membership offerings and other materials ("Creator Content").',
        },
        { type: 'paragraph', text: 'You retain all ownership rights in your Creator Content, subject to any existing agreements you have with third parties.' },
        { type: 'paragraph', text: 'By uploading or distributing Creator Content via Pluggd, you grant us a worldwide, non-exclusive, royalty-free, sublicensable licence to:' },
        {
          type: 'bullets',
          items: [
            'Host, store, reproduce and display your content;',
            'Transcode and stream audio and video;',
            'Make your content available to users in accordance with your settings, prices and licensing terms;',
            'Use your name, branding and content for the limited purpose of operating, promoting and improving the Services.',
          ],
        },
        {
          type: 'paragraph',
          text: 'You can terminate this licence by removing your Creator Content from Pluggd, except to the extent reasonably necessary for fulfilling existing purchases, maintaining records, or complying with legal obligations.',
        },
      ],
    },
    {
      number: '6',
      title: 'Your responsibilities as a creator',
      blocks: [
        { type: 'paragraph', text: 'By using Pluggd as a creator, you represent and warrant that:' },
        {
          type: 'bullets',
          items: [
            'You have all necessary rights, licences, permissions and consents to upload, sell, license and otherwise use your Creator Content on Pluggd;',
            'Your Creator Content does not infringe any copyright, trademark, moral right, privacy right, publicity right or other rights of any third party;',
            'You will honour the prices, terms, licenses, memberships, subscriptions and other offerings you publish on Pluggd;',
            'You will comply with applicable laws relating to consumer rights, digital goods, tax, advertising, data protection and financial reporting in your jurisdiction;',
            'You will pay any taxes, royalties or other amounts owed to third parties arising from your use of Pluggd and your Creator Content.',
          ],
        },
        {
          type: 'paragraph',
          tone: 'italic',
          text: 'Pluggd is not a party to agreements between you and your fans or customers, except as explicitly stated in these Terms.',
        },
      ],
    },
    {
      number: '7',
      title: 'Fan purchases and access',
      blocks: [
        {
          type: 'paragraph',
          text: 'When fans purchase or access content, memberships, tickets or other offerings ("Fan Purchases"), they may be entering into a direct relationship with the creator providing that content or offer.',
        },
        { type: 'paragraph', text: 'Pluggd provides the underlying infrastructure (checkout, delivery, accounts, streaming, membership gating) but:' },
        {
          type: 'bullets',
          items: [
            'Does not guarantee any specific content, performance or outcome;',
            'Is not responsible for creator promises or off-platform behaviour;',
            'May, where appropriate, assist in resolving disputes at our discretion.',
          ],
        },
      ],
    },
    {
      number: '8',
      title: 'Payments, fees and payouts',
      blocks: [
        {
          type: 'labelled-list',
          items: [
            { label: 'Payments', text: 'Processed by third-party providers. By using Pluggd, you agree to comply with their terms.' },
            { label: 'Platform fees', text: 'We may charge creators platform fees or take a percentage of transactions as clearly disclosed in our pricing.' },
            { label: 'Payouts', text: 'Subject to processing, clearance periods, KYC/AML checks and any applicable holds.' },
            { label: 'Chargebacks', text: 'We may place holds on funds, reverse payouts or adjust balances in the event of disputes or fraud.' },
            { label: 'Taxes', text: 'You are solely responsible for identifying and paying all taxes associated with your use of Pluggd.' },
          ],
        },
      ],
    },
    {
      number: '9',
      title: 'Acceptable use',
      blocks: [
        { type: 'paragraph', text: 'You agree not to use Pluggd to:' },
        {
          type: 'bullets',
          variant: 'danger-grid',
          items: [
            'Infringe intellectual property rights',
            'Upload unlawful, abusive or hate speech content',
            'Promote fraud or scams',
            'Distribute malware or harmful code',
            'Attempt unauthorised access to systems',
            'Interfere with the Services',
            'Circumvent payment flows or security',
            'Harvest personal data without consent',
          ],
        },
      ],
    },
    {
      number: '10',
      title: 'Intellectual property of Pluggd',
      blocks: [{ type: 'paragraph', text: 'All rights, title and interest in the Services (software, design, trademarks) are owned by Pluggd. You are granted a limited license to use the Services for their intended purpose.' }],
    },
    {
      number: '11',
      title: 'Beta and early access',
      blocks: [{ type: 'paragraph', text: 'Experimental features may change, break or be discontinued. You use beta features at your own risk.' }],
    },
    {
      number: '12',
      title: 'Service changes',
      blocks: [{ type: 'paragraph', text: 'We may modify, suspend or discontinue parts of the Services at any time. We are under no obligation to maintain any particular feature.' }],
    },
    {
      number: '13',
      title: 'Disclaimers',
      blocks: [{ type: 'paragraph', text: 'The Services are provided "as is" without warranties. We do not guarantee any specific financial or growth outcome for creators.' }],
    },
    {
      number: '14',
      title: 'Limitation of liability',
      blocks: [{ type: 'paragraph', text: 'To the maximum extent permitted by law, Pluggd is not liable for indirect damages, loss of profits or data. Our total liability is limited to the amount you paid us in the last 12 months or £100.' }],
    },
    {
      number: '15',
      title: 'Indemnity',
      blocks: [{ type: 'paragraph', text: 'You agree to indemnify Pluggd against claims arising from your use of the Services, your content, or your breach of these Terms.' }],
    },
    {
      number: '16',
      title: 'Termination',
      blocks: [{ type: 'paragraph', text: 'You may close your account at any time. We may terminate your access if you breach these Terms or for legal reasons.' }],
    },
    {
      number: '18',
      title: 'Governing law',
      blocks: [{ type: 'paragraph', text: 'These Terms are governed by the laws of England and Wales. Disputes shall be settled in the courts of England and Wales.' }],
    },
  ],
  contact: {
    number: '19',
    title: 'Contact',
    body: 'If you have any questions about these Terms:',
    emailLabel: 'Email',
    email: supportEmail,
  },
};

export const PRIVACY_DOCUMENT: NativeLegalDocument = {
  locale: 'en-GB',
  slug: 'privacy',
  title: 'Privacy Policy',
  lastUpdated: 'Last updated: December 2025',
  intro: [],
  sections: [
    {
      number: '1',
      title: 'Who we are',
      blocks: [
        { type: 'paragraph', text: 'Pluggd is a creator-first music platform where creators and their teams can sell releases, beats, sound packs, live sessions, courses, memberships and more, while fans can stream, tip, buy and subscribe.' },
        { type: 'paragraph', text: 'In this Privacy Policy, when we say "Pluggd", "we", "us" or "our", we are referring to Pluggd Ltd, the company operating the Pluggd platform, websites and services (together, the "Services").' },
        { type: 'paragraph', text: 'If you have any questions about this policy or how we handle your data, you can contact us at: support@pluggd.fm' },
      ],
    },
    {
      number: '2',
      title: 'What this policy covers',
      blocks: [
        { type: 'paragraph', text: 'This Privacy Policy explains:' },
        {
          type: 'bullets',
          items: [
            'What personal data we collect about you',
            'How we use that data and on what legal basis',
            'Who we share it with and why',
            'How long we keep it',
            'Your rights and how to exercise them',
            'How we protect your data',
            'How to contact us or lodge a complaint',
          ],
        },
        { type: 'paragraph', text: 'By using Pluggd, you acknowledge that you have read and understood this policy. We may update this policy from time to time. When we do, we will update the "Last updated" date above.' },
      ],
    },
    {
      number: '3',
      title: 'The data we collect',
      blocks: [{ type: 'paragraph', text: 'The information we collect depends on how you use Pluggd (fan, creator, team member, admin).' }],
    },
    {
      number: '3.1',
      title: 'Information you provide to us',
      blocks: [
        {
          type: 'labelled-list',
          items: [
            { label: 'Account information', text: 'Name, display name/handle, email address, password, profile picture, bio, links, role.' },
            { label: 'Creator and business details', text: 'Brand name, payout details, tax information, KYC/identity verification data.' },
            { label: 'Content and catalog data', text: 'Audio files, artwork, videos, metadata, membership tiers, course content.' },
            { label: 'Commerce and transaction data', text: 'Purchases, tips, subscriptions, billing address, order history.' },
            { label: 'Communications', text: 'Support messages, feedback, survey responses.' },
          ],
        },
      ],
    },
    {
      number: '3.2',
      title: 'Information we collect automatically',
      blocks: [
        {
          type: 'labelled-list',
          items: [
            { label: 'Usage data', text: 'Pages visited, buttons clicked, features used, session duration.' },
            { label: 'Device and technical data', text: 'IP address, browser type, device identifiers, OS, time zone.' },
            { label: 'Audio playback and engagement', text: 'Streams, plays, playlist activity, likes, follows.' },
          ],
        },
      ],
    },
    {
      number: '4',
      title: 'How we use your data',
      blocks: [
        {
          type: 'bullets',
          items: [
            'Provide and maintain the Services',
            'Create and manage accounts',
            'Host your catalog and storefronts',
            'Process payments and payouts',
            'Deliver audio streams and downloads',
            'Personalise content and recommendations',
            'Detect and prevent fraud',
            'Enforce our Terms of Service',
          ],
        },
      ],
    },
    {
      number: '5',
      title: 'Legal bases (UK/EU/EEA)',
      blocks: [
        { type: 'paragraph', text: 'Where applicable law (such as UK GDPR / EU GDPR) applies, we rely on:' },
        {
          type: 'labelled-list',
          items: [
            { label: 'Contract', text: 'To provide the Services you have requested.' },
            { label: 'Legitimate interests', text: 'To improve the platform, security, and fraud prevention.' },
            { label: 'Consent', text: 'For certain cookies and marketing.' },
            { label: 'Legal obligation', text: 'For tax, KYC/AML and compliance.' },
          ],
        },
      ],
    },
    {
      number: '6',
      title: 'How we share your data',
      blocks: [
        { type: 'paragraph', tone: 'strong', text: 'We do not sell your personal data.' },
        { type: 'paragraph', text: 'We may share your data with:' },
        {
          type: 'labelled-list',
          items: [
            { label: 'Service providers', text: 'Hosting, payment processors, KYC verification, email services.' },
            { label: 'Creators and fans', text: 'To fulfil purchases and manage memberships.' },
            { label: 'Business transfers', text: 'In mergers or acquisitions.' },
            { label: 'Legal reasons', text: 'To comply with laws or protect rights and safety.' },
          ],
        },
      ],
    },
    {
      number: '7',
      title: 'International transfers',
      blocks: [{ type: 'paragraph', text: 'We may process and store your information in countries other than the one you reside in. We use appropriate safeguards for cross-border transfers.' }],
    },
    {
      number: '8',
      title: 'Data retention',
      blocks: [{ type: 'paragraph', text: 'We retain data as long as necessary to provide services and comply with legal obligations. We delete or anonymise data when no longer needed.' }],
    },
    {
      number: '9',
      title: 'Your rights',
      blocks: [{ type: 'paragraph', text: 'You may have rights to access, correct, delete, or object to processing of your data. Contact us at support@pluggd.fm to exercise these rights.' }],
    },
    {
      number: '10',
      title: 'Children',
      blocks: [{ type: 'paragraph', text: 'Pluggd is not intended for children under 16. We do not knowingly collect data from children under this age.' }],
    },
  ],
  contact: {
    title: 'Contact us',
    body: 'If you have questions about this Privacy Policy:',
    emailLabel: 'Email',
    email: supportEmail,
  },
};
