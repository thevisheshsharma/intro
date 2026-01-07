'use client'

import { motion } from 'framer-motion'

const STANDARD_EASE = [0.25, 0.1, 0.25, 1] as const

export default function PrivacyPage() {
    return (
        <section className="pt-32 pb-20 bg-gray-50 min-h-screen">
            <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: STANDARD_EASE }}
                    className="max-w-3xl mx-auto"
                >
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full glass-raspberry text-berri-raspberry text-sm font-medium mb-6">
                        Legal
                    </span>
                    <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-gray-900 mb-4">
                        Privacy Policy
                    </h1>
                    <p className="text-gray-500 mb-12">Last updated: January 2025</p>

                    <div className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-gray-700 prose-li:text-gray-700">
                        <p>
                            At Berri (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), we are committed to protecting your privacy.
                            This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                            when you use our relationship intelligence platform and related services.
                        </p>

                        <h2>1. Information We Collect</h2>

                        <h3>1.1 Information You Provide</h3>
                        <ul>
                            <li><strong>Account Information:</strong> Name, email address, and password when you create an account.</li>
                            <li><strong>Profile Information:</strong> Professional details, company information, and preferences you choose to share.</li>
                            <li><strong>Social Media Data:</strong> When you connect your Twitter/X account, we access your public profile, followers, and following lists to build your network graph.</li>
                            <li><strong>Payment Information:</strong> Billing details processed securely through our payment providers (we do not store full payment card numbers).</li>
                            <li><strong>Communications:</strong> Messages you send to us for support or feedback.</li>
                        </ul>

                        <h3>1.2 Information Collected Automatically</h3>
                        <ul>
                            <li><strong>Usage Data:</strong> Features used, searches performed, and interaction patterns within our platform.</li>
                            <li><strong>Device Information:</strong> Browser type, operating system, device identifiers, and IP address.</li>
                            <li><strong>Cookies and Tracking:</strong> We use cookies and similar technologies to enhance your experience and analyze usage.</li>
                        </ul>

                        <h3>1.3 Information from Third Parties</h3>
                        <ul>
                            <li><strong>Public Data:</strong> Publicly available information from social media platforms, company websites, and professional networks.</li>
                            <li><strong>Data Partners:</strong> Business information from trusted data providers to enrich company and people intelligence.</li>
                        </ul>

                        <h2>2. How We Use Your Information</h2>
                        <p>We use the collected information to:</p>
                        <ul>
                            <li>Provide, maintain, and improve our services</li>
                            <li>Build and analyze your relationship network graph</li>
                            <li>Generate warm introduction paths to your target connections</li>
                            <li>Provide company and people intelligence features</li>
                            <li>Process transactions and send related information</li>
                            <li>Send technical notices, updates, and support messages</li>
                            <li>Respond to your comments and questions</li>
                            <li>Analyze usage trends to improve our platform</li>
                            <li>Detect, prevent, and address technical issues and fraud</li>
                        </ul>

                        <h2>3. Information Sharing</h2>
                        <p>We do not sell your personal information. We may share information in the following circumstances:</p>
                        <ul>
                            <li><strong>Service Providers:</strong> With third-party vendors who assist in operating our platform (hosting, analytics, payment processing).</li>
                            <li><strong>Legal Requirements:</strong> When required by law, subpoena, or to protect our rights and safety.</li>
                            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
                            <li><strong>With Your Consent:</strong> When you explicitly authorize sharing.</li>
                        </ul>
                        <p>
                            <strong>Important:</strong> Your network data and connection graphs are never shared with other users.
                            Each user&apos;s network remains private and isolated.
                        </p>

                        <h2>4. Data Security</h2>
                        <p>
                            We implement industry-standard security measures to protect your information, including:
                        </p>
                        <ul>
                            <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                            <li>Regular security assessments and penetration testing</li>
                            <li>Access controls and authentication requirements</li>
                            <li>Secure cloud infrastructure with SOC 2 compliance</li>
                        </ul>
                        <p>
                            However, no method of transmission over the Internet is 100% secure.
                            We cannot guarantee absolute security of your data.
                        </p>

                        <h2>5. Data Retention</h2>
                        <p>
                            We retain your personal information for as long as your account is active or as needed
                            to provide services. We may retain certain information as required by law or for
                            legitimate business purposes. You can request deletion of your data at any time.
                        </p>

                        <h2>6. Your Rights and Choices</h2>
                        <p>Depending on your location, you may have the right to:</p>
                        <ul>
                            <li><strong>Access:</strong> Request a copy of your personal information</li>
                            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                            <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                            <li><strong>Portability:</strong> Receive your data in a portable format</li>
                            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                            <li><strong>Withdraw Consent:</strong> Revoke previously given consent</li>
                        </ul>
                        <p>
                            To exercise these rights, contact us at privacy@berri.ai
                        </p>

                        <h2>7. Cookies and Tracking Technologies</h2>
                        <p>We use cookies and similar technologies for:</p>
                        <ul>
                            <li><strong>Essential Cookies:</strong> Required for platform functionality</li>
                            <li><strong>Analytics Cookies:</strong> To understand how users interact with our platform</li>
                            <li><strong>Preference Cookies:</strong> To remember your settings and preferences</li>
                        </ul>
                        <p>
                            You can control cookies through your browser settings. Disabling certain cookies
                            may affect platform functionality.
                        </p>

                        <h2>8. International Data Transfers</h2>
                        <p>
                            Your information may be transferred to and processed in countries other than your own.
                            We ensure appropriate safeguards are in place for such transfers, including standard
                            contractual clauses approved by relevant authorities.
                        </p>

                        <h2>9. Children&apos;s Privacy</h2>
                        <p>
                            Our services are not intended for individuals under 18 years of age. We do not
                            knowingly collect personal information from children. If we learn we have collected
                            information from a child, we will delete it promptly.
                        </p>

                        <h2>10. Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of any
                            material changes by posting the new policy on this page and updating the
                            &quot;Last updated&quot; date. Your continued use of our services after changes
                            constitutes acceptance of the updated policy.
                        </p>

                        <h2>11. Contact Us</h2>
                        <p>
                            If you have questions about this Privacy Policy or our data practices, please contact us at:
                        </p>
                        <ul>
                            <li>Email: privacy@berri.ai</li>
                            <li>Address: Berri Inc., [Address to be added]</li>
                        </ul>

                        <div className="mt-12 p-6 rounded-2xl bg-white border border-gray-200">
                            <p className="text-sm text-gray-500 mb-0">
                                By using Berri, you acknowledge that you have read and understood this Privacy Policy
                                and agree to the collection, use, and disclosure of your information as described herein.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
