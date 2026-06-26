import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { usePublicPageLoading } from '../components/PublicPageLoader';
import { useCmsPage } from '../hooks/useCmsPage';

const termsSections = [
  {
    title: '1. Our Services',
    paragraphs: ['Pranvith DOP provides digital products and creative services, including but not limited to:'],
    bullets: ['Video editing services', 'Photography and videography services', 'VFX assets', 'LUTs', 'Templates', 'Project files', 'Presets', 'Courses', 'Digital downloads', 'Creative resources'],
    after: ['Our services are mainly intended for users in India. If you access our website from outside India, you are responsible for following your local laws.'],
  },
  {
    title: '2. Intellectual Property Rights',
    paragraphs: ['All content available on the Pranvith DOP website belongs to Pranvith DOP or is licensed to us.', 'This includes:'],
    bullets: ['Website design', 'Text', 'Images', 'Videos', 'Digital products', 'Course content', 'LUTs', 'Templates', 'Project files', 'Graphics', 'Logos', 'Branding', 'Software features'],
    after: ['You are allowed to use purchased products only as per the product license.', 'You may not copy, resell, share, upload, redistribute, modify, or publicly display our products or content without written permission from Pranvith DOP.'],
  },
  {
    title: '3. Digital Product Usage',
    paragraphs: ['When you purchase digital products from Pranvith DOP, you receive a limited license to use them for personal or professional creative work.', 'You are not allowed to:'],
    bullets: ['Resell our products', 'Share download links with others', 'Upload products to other websites', 'Claim our products as your own', 'Distribute files in free or paid groups', 'Repackage our products and sell them'],
    after: ['Any misuse may result in account suspension and legal action.'],
  },
  {
    title: '4. User Responsibilities',
    paragraphs: ['By using our website, you confirm that:'],
    bullets: ['You are legally able to agree to these terms.', 'The information you provide is true and accurate.', 'You will not misuse our website or products.', 'You will not use bots, scripts, or automated tools to access our website.', 'You will not upload harmful files, malware, or viruses.', 'You will not use our content for illegal purposes.'],
  },
  { title: '5. User Accounts', paragraphs: ['Some features may require you to create an account.', 'You are responsible for keeping your login details safe. Pranvith DOP is not responsible for any loss caused by unauthorized access to your account.'] },
  { title: '6. Products and Services', paragraphs: ['All products and services are subject to availability.', 'Pranvith DOP may update, change, remove, or discontinue any product, service, price, or offer at any time without prior notice.', 'We try to display product details, previews, and descriptions clearly, but we do not guarantee that every product will match every user\'s expectation, software version, device, or workflow.'] },
  {
    title: '7. Purchases and Payments',
    paragraphs: ['We may accept payments through:'],
    bullets: ['UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Wallets', 'Razorpay or other secure payment gateways'],
    after: ['All prices are shown in Indian Rupees, unless stated otherwise.', 'By making a purchase, you authorize Pranvith DOP and our payment gateway partners to process your payment.', 'Pranvith DOP does not store full card details or sensitive payment information.'],
  },
  { title: '8. Digital Downloads', paragraphs: ['After successful payment, digital products may be delivered through download links, email, user account access, or website download pages.', 'You are responsible for downloading and saving your purchased files safely.', 'Download access may be limited, removed, or blocked if misuse, fraud, or unauthorized sharing is detected.'] },
  { title: '9. Refund Policy', paragraphs: ['All digital product sales are final and non-refundable.', 'Refunds are not provided once a digital product, course, download, template, LUT, preset, or project file has been purchased or accessed.', 'For service-based work, refund or cancellation terms may depend on the project stage and agreement.', 'Please check product details carefully before purchasing.'] },
  { title: '10. Courses', paragraphs: ['Course content is provided for learning and educational purposes.', 'You may not record, resell, share, copy, or distribute course videos, notes, files, or private materials without permission from Pranvith DOP.', 'Access to courses may be removed if misuse is detected.'] },
  {
    title: '11. Prohibited Activities',
    paragraphs: ['You agree not to:'],
    bullets: ['Steal or misuse user information', 'Copy or misuse Pranvith DOP content', 'Resell or redistribute our digital products', 'Upload malware or harmful files', 'Harass, abuse, or harm other users', 'Use our website for illegal activities', 'Try to hack, damage, or overload the website', 'Use our intellectual property to compete against Pranvith DOP'],
    after: ['Violation of these rules may result in account suspension, permanent ban, cancellation of access, and legal action.'],
  },
  { title: '12. User Content', paragraphs: ['If you submit reviews, comments, testimonials, messages, uploads, or feedback, you allow Pranvith DOP to use, display, reproduce, and publish that content for website, marketing, and service-related purposes.', 'You still own your content, but you give Pranvith DOP permission to use it.'] },
  {
    title: '13. Reviews and Testimonials',
    paragraphs: ['Reviews must be honest and respectful.', 'Reviews must not contain:'],
    bullets: ['Fake or misleading information', 'Offensive language', 'Abuse or harassment', 'Discrimination', 'Illegal content', 'Spam or promotional links'],
    after: ['Pranvith DOP may remove reviews that violate these rules.'],
  },
  { title: '14. Social Media', paragraphs: ['Our website may include links to Instagram, YouTube, WhatsApp, or other third-party platforms.', 'Pranvith DOP is not responsible for third-party platform content, privacy policies, or technical issues.'] },
  { title: '15. Website Management', paragraphs: ['Pranvith DOP may monitor website activity to protect users, prevent fraud, improve security, and enforce these terms.', 'We may restrict, suspend, or remove access if a user violates these Terms & Conditions.'] },
  { title: '16. Privacy Policy', paragraphs: ['By using Pranvith DOP, you also agree to our Privacy Policy mentioned below.'] },
  { title: '17. Termination', paragraphs: ['Pranvith DOP may suspend or terminate your account, download access, course access, or service access without notice if you violate these Terms & Conditions.'] },
  { title: '18. Service Changes and Downtime', paragraphs: ['Our website or services may sometimes be updated, changed, interrupted, or temporarily unavailable.', 'Pranvith DOP is not responsible for any loss caused by downtime, technical issues, updates, or service interruptions.'] },
  { title: '19. Governing Law', paragraphs: ['These Terms & Conditions are governed by the laws of India.'] },
  { title: '20. Dispute Resolution', paragraphs: ['Any disputes related to Pranvith DOP, our website, products, or services will be handled under applicable Indian laws.'] },
  {
    title: '21. WhatsApp Communication Consent',
    paragraphs: ['By providing your phone number, you agree to receive important updates from Pranvith DOP through WhatsApp, SMS, email, or phone call.', 'These messages may include:'],
    bullets: ['Order updates', 'Download updates', 'Service updates', 'Course updates', 'Support messages', 'Payment-related communication'],
    after: ['You can withdraw your consent anytime by contacting us.'],
  },
  { title: '22. Contact Us', paragraphs: ['Pranvith DOP', 'Website: https://pranvithdop.com', 'Email: info@pranvithdop.com', 'Phone: +91 9059867883', 'Location: India'] },
];

const privacySections = [
  {
    title: '1. Information We Collect',
    paragraphs: ['We may collect the following information:', 'Personal Information'],
    bullets: ['Name', 'Email address', 'Phone number', 'Billing details', 'Account details', 'Social media username, if provided'],
    after: ['Technical Information', 'IP address, device details, browser details, cookies, website usage data, and analytics data.', 'Transaction Information', 'Purchase history, order details, payment status, and download access details.', 'Payment information is processed securely by our payment gateway partners. Pranvith DOP does not store full card numbers or sensitive banking information.'],
  },
  { title: '2. How We Use Your Information', paragraphs: ['We use your information to:'], bullets: ['Deliver digital products', 'Provide download access', 'Manage course access', 'Process payments', 'Provide customer support', 'Send order and service updates', 'Improve website performance', 'Improve website security', 'Prevent fraud and misuse', 'Contact you about your purchase or service request'] },
  { title: '3. Data Sharing', paragraphs: ['Pranvith DOP does not sell your personal data.', 'We may share your information only with:'], bullets: ['Payment gateway providers', 'Hosting and website service providers', 'Email or communication service providers', 'Analytics and security tools', 'Legal authorities, if required by law'], after: ['We only share information when it is necessary to operate our website, deliver services, or follow legal requirements.'] },
  { title: '4. Data Security', paragraphs: ['Pranvith DOP uses reasonable security measures to protect your information.', 'However, no online system is 100% secure. We cannot guarantee complete security of data transmitted through the internet.'] },
  { title: '5. Data Retention', paragraphs: ['We keep your information only as long as needed to:'], bullets: ['Provide products and services', 'Maintain order records', 'Provide support', 'Prevent fraud', 'Comply with legal requirements'] },
  { title: '6. Your Rights', paragraphs: ['You may request:'], bullets: ['Access to your personal data', 'Correction of incorrect data', 'Deletion of your account or data'], after: ['To request this, contact us by email.'] },
  { title: '7. Cookies', paragraphs: ['Our website may use cookies to:'], bullets: ['Improve user experience', 'Remember preferences', 'Track website performance', 'Analyze traffic', 'Improve security'], after: ['You can disable cookies through your browser settings.'] },
  { title: '8. Minors', paragraphs: ['Users under 18 should use our website and services only with parent or guardian supervision.'] },
  { title: '9. Third-Party Links', paragraphs: ['Our website may contain links to third-party websites such as Instagram, YouTube, payment gateways, or other platforms.', 'Pranvith DOP is not responsible for the content, privacy policies, or security practices of third-party websites.'] },
  { title: '10. Marketing and Communication', paragraphs: ['We may contact you through email, phone, SMS, or WhatsApp for:'], bullets: ['Order updates', 'Download support', 'Course updates', 'Service updates', 'Offers and announcements', 'Customer support'], after: ['You may request to stop receiving promotional messages anytime.'] },
  { title: '11. Changes to This Privacy Policy', paragraphs: ['Pranvith DOP may update this Privacy Policy from time to time.', 'Continued use of our website or services after updates means you accept the revised policy.'] },
  { title: '12. Contact for Privacy Questions', paragraphs: ['For privacy-related questions, contact:', 'Pranvith DOP', 'Website: https://pranvithdop.com', 'Email: info@pranvithdop.com', 'Phone: +91 9059867883', 'Location: India'] },
];

const LegalSection = ({ section }) => (
  <section className="border-t border-white/10 py-8 first:border-t-0 first:pt-0">
    <h2 className="text-2xl font-semibold tracking-tight text-white">{section.title}</h2>
    <div className="mt-4 space-y-3 text-sm leading-7 text-white/68">
      {(section.paragraphs || []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {section.bullets && (
        <ul className="grid gap-2 pl-5 marker:text-violet-300 sm:grid-cols-2">
          {section.bullets.map((item) => <li key={item} className="list-disc">{item}</li>)}
        </ul>
      )}
      {(section.after || []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </div>
  </section>
);

const findLegalSection = (page) =>
  (page?.sections || []).find((section) => section.section_id === 'legal-sections')
  || (page?.sections || []).find((section) => section.type === 'text');

const cmsItemsOrFallback = (section, fallback) => {
  const items = section?.data?.items;
  return Array.isArray(items) && items.length ? items.filter((item) => item.enabled !== false) : fallback;
};

const Privacy = () => {
  const { page: privacyPage, loading: privacyLoading } = useCmsPage('privacy');
  const { page: termsPage, loading: termsLoading } = useCmsPage('terms');
  const loading = privacyLoading || termsLoading;
  usePublicPageLoading(loading);

  const termsSection = findLegalSection(termsPage);
  const privacySection = findLegalSection(privacyPage);
  const visibleTermsSections = cmsItemsOrFallback(termsSection, termsSections);
  const visiblePrivacySections = cmsItemsOrFallback(privacySection, privacySections);

  return (
    <main className="page bg-[var(--bg-main)] text-white">
      <Header />
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-300">{termsPage?.subtitle || 'Legal'}</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">{termsPage?.title || 'Terms & Conditions'}</h1>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-white/68">
            {termsSection?.description || <>These Terms & Conditions are a legal agreement between you and <strong className="text-white">Pranvith DOP</strong>. By using our website, products, digital assets, courses, services, or any related content, you agree to follow these terms.</>}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68">
            {termsSection?.data?.intro_after || 'Please read these terms carefully. If you do not agree, please do not use our website or services.'}
          </p>
        </div>
      </section>

      <div id="terms" className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
          {visibleTermsSections.map((section) => <LegalSection key={section.title} section={section} />)}
        </div>
      </div>

      <section id="privacy" className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-300">{privacyPage?.title || 'Privacy Policy'}</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">{privacyPage?.subtitle || 'Privacy Policy - Pranvith DOP'}</h2>
          <p className="mt-4 text-sm text-white/55">{privacySection?.subtitle || 'Last Updated: 23 June 2026'}</p>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-white/68">
            {privacySection?.description || 'This Privacy Policy explains how Pranvith DOP collects, uses, stores, and protects your information when you use our website, products, digital downloads, courses, and services.'}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68">{privacySection?.data?.intro_after || 'By using our website or services, you agree to this Privacy Policy.'}</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
          {visiblePrivacySections.map((section) => <LegalSection key={section.title} section={section} />)}
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default Privacy;
